import { Inject, Injectable } from '@nestjs/common';
import { In, LessThan, MoreThan } from 'typeorm';
import { DI } from '@/di-symbols.js';
import type { AntennaNotesRepository, MutedNotesRepository, NotificationsRepository, UserIpsRepository } from '@/models/index.js';
import type { Config } from '@/config.js';
import type Logger from '@/logger.js';
import { bindThis } from '@/decorators.js';
import { IdService } from '@/core/IdService.js';
import { QueueLoggerService } from '../QueueLoggerService.js';
import type Bull from 'bull';

@Injectable()
export class CleanProcessorService {
	private logger: Logger;

	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.userIpsRepository)
		private userIpsRepository: UserIpsRepository,

		@Inject(DI.notificationsRepository)
		private notificationsRepository: NotificationsRepository,

		@Inject(DI.mutedNotesRepository)
		private mutedNotesRepository: MutedNotesRepository,

		@Inject(DI.antennaNotesRepository)
		private antennaNotesRepository: AntennaNotesRepository,

		private queueLoggerService: QueueLoggerService,
		private idService: IdService,
	) {
		this.logger = this.queueLoggerService.logger.createSubLogger('clean');
	}

	@bindThis
	public async process(job: Bull.Job<Record<string, unknown>>, done: () => void): Promise<void> {
		this.logger.info('Cleaning...');

		this.userIpsRepository.delete({
			createdAt: LessThan(new Date(Date.now() - (1000 * 60 * 60 * 24 * 90))),
		});

		this.notificationsRepository.delete({
			createdAt: LessThan(new Date(Date.now() - (1000 * 60 * 60 * 24 * 90))),
		});

		this.mutedNotesRepository.delete({
			id: LessThan(this.idService.genId(new Date(Date.now() - (1000 * 60 * 60 * 24 * 90)))),
			reason: 'word',
		});

		this.antennaNotesRepository.delete({
			id: LessThan(this.idService.genId(new Date(Date.now() - (1000 * 60 * 60 * 24 * 90)))),
		});

		this.logger.succ('Cleaned.');
		done();
	}
}
