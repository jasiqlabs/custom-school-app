import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SessionActor } from '@custom-school/contracts';
export const CurrentSession=createParamDecorator((_data:unknown,ctx:ExecutionContext):SessionActor=>ctx.switchToHttp().getRequest<any>().auth);
