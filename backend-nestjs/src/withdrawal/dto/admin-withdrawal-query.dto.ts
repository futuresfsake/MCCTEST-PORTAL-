import { RegistrarWithdrawalQueryDto } from './registrar-withdrawal-query.dto';

/**
 * The admin list takes the same filters as the registrar list: a status (or
 * `ALL`), program, batch, a name search and paging. Only the default differs:
 * left without a status, the admin sees what waits for the admin
 * (PENDING_ADMIN_SIGNOFF). That default is applied by the service.
 */
export class AdminWithdrawalQueryDto extends RegistrarWithdrawalQueryDto {}
