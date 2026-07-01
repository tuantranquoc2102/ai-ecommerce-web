import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  LoginDto,
  RegisterDto,
  RefreshDto,
  OtpRequestDto,
  OtpVerifyDto,
  PasswordResetRequestDto,
  PasswordResetConfirmDto,
  TwoFactorEnableDto,
  TwoFactorVerifyDto,
} from '@ecom/shared';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { Inject } from '@nestjs/common';
import { ENV_TOKEN, type AppEnv } from '../../config/env';
import type { OAuthProfile } from './strategies/google.strategy';

function ctxFrom(req: FastifyRequest) {
  return {
    userAgent: (req.headers['user-agent'] as string | undefined) ?? undefined,
    ipAddress: req.ip,
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly twoFa: TwoFactorService,
    @Inject(ENV_TOKEN) private readonly env: AppEnv,
  ) {}

  @Public()
  @Post('register')
  async register(@Body(new ZodValidationPipe(RegisterDto)) body: RegisterDto) {
    const user = await this.auth.register(body);
    return { id: user.id, email: user.email };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body(new ZodValidationPipe(LoginDto)) body: LoginDto, @Req() req: FastifyRequest) {
    return this.auth.login(body, ctxFrom(req));
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login/2fa')
  async loginTwoFactor(
    @Body(new ZodValidationPipe(TwoFactorVerifyDto)) body: TwoFactorVerifyDto,
    @Req() req: FastifyRequest,
  ) {
    return this.auth.verifyTwoFactor(body.ticket, body.code, ctxFrom(req));
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body(new ZodValidationPipe(RefreshDto)) body: RefreshDto, @Req() req: FastifyRequest) {
    return this.auth.refresh(body.refreshToken, ctxFrom(req));
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Body(new ZodValidationPipe(RefreshDto)) body: RefreshDto) {
    await this.auth.logout(body.refreshToken);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('otp/request')
  async otpRequest(@Body(new ZodValidationPipe(OtpRequestDto)) body: OtpRequestDto) {
    return this.auth.requestOtp(body.identifier, body.channel);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('otp/verify')
  async otpVerify(@Body(new ZodValidationPipe(OtpVerifyDto)) body: OtpVerifyDto, @Req() req: FastifyRequest) {
    return this.auth.verifyOtp(body.identifier, body.code, ctxFrom(req));
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('password/reset/request')
  async passwordResetRequest(
    @Body(new ZodValidationPipe(PasswordResetRequestDto)) body: PasswordResetRequestDto,
  ) {
    await this.auth.requestPasswordReset(body.email);
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('password/reset/confirm')
  async passwordResetConfirm(
    @Body(new ZodValidationPipe(PasswordResetConfirmDto)) body: PasswordResetConfirmDto,
  ) {
    await this.auth.confirmPasswordReset(body.token, body.newPassword);
  }

  @Post('2fa/setup')
  async twoFaSetup(@CurrentUser() user: RequestUser) {
    return this.twoFa.beginSetup(user.id, user.email);
  }

  @Post('2fa/enable')
  async twoFaEnable(
    @Body(new ZodValidationPipe(TwoFactorEnableDto)) body: TwoFactorEnableDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.twoFa.enable(user.id, body.code);
  }

  @Post('2fa/disable')
  async twoFaDisable(
    @Body(new ZodValidationPipe(TwoFactorEnableDto)) body: TwoFactorEnableDto,
    @CurrentUser() user: RequestUser,
  ) {
    await this.twoFa.disable(user.id, body.code);
  }

  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    return this.auth.buildAuthUserView(user.id);
  }

  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('oauth/google')
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  googleRedirect(): void {}

  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('oauth/google/callback')
  async googleCallback(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const profile = (req as unknown as { user: OAuthProfile }).user;
    const result = await this.auth.oauthLogin('google', profile, ctxFrom(req));
    return this.oauthRedirect(reply, result.tokens.refreshToken, result.tokens.accessToken);
  }

  @Public()
  @UseGuards(AuthGuard('facebook'))
  @Get('oauth/facebook')
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  facebookRedirect(): void {}

  @Public()
  @UseGuards(AuthGuard('facebook'))
  @Get('oauth/facebook/callback')
  async facebookCallback(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const profile = (req as unknown as { user: OAuthProfile }).user;
    const result = await this.auth.oauthLogin('facebook', profile, ctxFrom(req));
    return this.oauthRedirect(reply, result.tokens.refreshToken, result.tokens.accessToken);
  }

  private oauthRedirect(reply: FastifyReply, refreshToken: string, accessToken: string) {
    const url = new URL('/oauth/callback', this.env.FRONTEND_URL);
    url.searchParams.set('rt', refreshToken);
    url.searchParams.set('at', accessToken);
    return reply.redirect(url.toString(), 302);
  }
}
