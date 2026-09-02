import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../common/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  // Validate user credentials.
  // El correo identifica al usuario; el centro clínico se resuelve automáticamente.
  // tenantSlug solo se usa como desempate si el mismo correo existe en varios centros.
  async validateUser(email: string, password: string, tenantSlug?: string) {
    const normalizedEmail = (email || '').trim().toLowerCase();

    // Búsqueda insensible a mayúsculas para no depender de cómo se escribió al registrarse
    const candidates = await this.prisma.user.findMany({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        isActive: true,
      },
      include: { tenant: { select: { id: true, name: true, slug: true, isActive: true } } },
    });

    const usable = candidates.filter((u) => u.tenant?.isActive);
    if (usable.length === 0) throw new UnauthorizedException('Credenciales inválidas');

    let user = usable[0];

    // Mismo correo en varios centros: se requiere elegir
    if (usable.length > 1) {
      if (!tenantSlug) {
        throw new ConflictException({
          statusCode: 409,
          message: 'Este correo está registrado en varios centros clínicos. Seleccione uno.',
          error: 'MULTIPLE_TENANTS',
          tenants: usable.map((u) => ({ slug: u.tenant.slug, name: u.tenant.name })),
        });
      }
      const match = usable.find((u) => u.tenant.slug === tenantSlug);
      if (!match) throw new UnauthorizedException('Credenciales inválidas');
      user = match;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return user;
  }

  // Generate access + refresh tokens
  async login(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = this.jwtService.sign(payload);

    // Store refresh token
    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await this.prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  // Refresh access token
  async refreshToken(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Token de refresco inválido o expirado');
    }

    // Rotate refresh token
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.login(stored.user);
  }

  // Logout
  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    return { message: 'Sesión cerrada exitosamente' };
  }

  // Register first admin for a new tenant
  async registerTenantAdmin(dto: RegisterDto) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug } });
    if (existing) throw new ConflictException('Este centro clínico ya está registrado');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const normalizedEmail = dto.email.trim().toLowerCase();

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.centerName,
        slug: dto.tenantSlug,
        country: dto.country || 'CO',
        users: {
          create: {
            email: normalizedEmail,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: 'TENANT_ADMIN',
            specialty: dto.specialty,
          },
        },
      },
      include: { users: true },
    });

    return this.login(tenant.users[0]);
  }
}
