import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(OptionalJwtGuard.name);

  // Override to make it optional
  canActivate(context: ExecutionContext) {
    // Call parent's canActivate, but don't throw if token is missing
    return super.canActivate(context) || Promise.resolve(true);
  }

  handleRequest(err: any, user: any, info: any) {
    this.logger.log(`OptionalJwtGuard - err: ${err ? 'present' : 'none'}, user: ${user ? 'present' : 'none'}, info: ${info ? JSON.stringify(info) : 'none'}`);
    
    if (user) {
      this.logger.log(`OptionalJwtGuard - User authenticated: ${JSON.stringify(user)}`);
    } else {
      this.logger.log(`OptionalJwtGuard - No user authenticated`);
    }
    
    // Return user if authenticated, undefined if not
    return user || undefined;
  }
}
