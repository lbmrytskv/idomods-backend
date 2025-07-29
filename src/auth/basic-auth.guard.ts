import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
// Makes this class injectable and usable as a guard
export class BasicAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    // Extract the Authorization header
    const authHeader = req.headers['authorization'];

    // If header is missing or not Basic, reject the request
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="API Access"');
      res.status(401).send('Unauthorized');
      return false;
    }

    // Decode credentials from base64
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    // Retrieve expected credentials from environment
    const expectedUser = this.configService.get<string>('BASIC_USER');
    const expectedPass = this.configService.get<string>('BASIC_PASS');

    // Compare provided vs expected credentials
    if (username !== expectedUser || password !== expectedPass) {
      res.setHeader('WWW-Authenticate', 'Basic realm="API Access"');
      res.status(401).send('Unauthorized');
      return false;
    }

    // Allow request
    return true;
  }
}

