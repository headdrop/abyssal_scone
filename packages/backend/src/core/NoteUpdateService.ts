import { Injectable, Inject } from '@nestjs/common';
import type { MiUser } from '@/models/User.js';
import type { MiNote } from '@/models/Note.js';
import type { InstancesRepository, NotesRepository, UsersRepository } from '@/models/_.js';
import { RelayService } from '@/core/RelayService.js';
import { FederatedInstanceService } from '@/core/FederatedInstanceService.js';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import NotesChart from '@/core/chart/charts/notes.js';
import PerUserNotesChart from '@/core/chart/charts/per-user-notes.js';
import InstanceChart from '@/core/chart/charts/instance.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { ApRendererService } from '@/core/activitypub/ApRendererService.js';
import { ApDeliverManagerService } from '@/core/activitypub/ApDeliverManagerService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { bindThis } from '@/decorators.js';
import { MetaService } from '@/core/MetaService.js';
import { SearchService } from '@/core/SearchService.js';

type Option = {
	visibility: string;
};

@Injectable()
export class NoteUpdateService {
	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		@Inject(DI.instancesRepository)
		private instancesRepository: InstancesRepository,

		private userEntityService: UserEntityService,
		private noteEntityService: NoteEntityService,
		private globalEventService: GlobalEventService,
		private relayService: RelayService,
		private federatedInstanceService: FederatedInstanceService,
		private apRendererService: ApRendererService,
		private apDeliverManagerService: ApDeliverManagerService,
		private metaService: MetaService,
		private searchService: SearchService,
		private notesChart: NotesChart,
		private perUserNotesChart: PerUserNotesChart,
		private instanceChart: InstanceChart,
	) {}

	@bindThis
	async update(user: { id: MiUser['id']; uri: MiUser['uri']; host: MiUser['host']; isBot: MiUser['isBot']; }, note: MiNote, data: Option) {
		const updatedAt = new Date();
		const cascadingNotes = await this.findCascadingNotes(note);

		this.globalEventService.publishNoteStream(note.id, 'updated', {
			updatedAt: updatedAt,
			visibility: data.visibility,
		});

		for (const cascadingNote of cascadingNotes) {
			if (cascadingNote.visibility === 'public' && data.visibility !== 'public') {
				this.globalEventService.publishNoteStream(cascadingNote.id, 'updated', {
					updatedAt: updatedAt,
					visibility: data.visibility,
				});

				await this.notesRepository.update({
					id: cascadingNote.id,
				}, {
					updatedAt: updatedAt,
					visibility: data.visibility as any,
				});
			}
		}

		await this.notesRepository.update({
			id: note.id,
			userId: user.id,
		}, {
			updatedAt: updatedAt,
			visibility: data.visibility as any,
		});
	}

	@bindThis
	private async findCascadingNotes(note: MiNote): Promise<MiNote[]> {
		const recursive = async (noteId: string): Promise<MiNote[]> => {
			const query = this.notesRepository.createQueryBuilder('note')
				.where('note.replyId = :noteId', { noteId })
				.orWhere('note.renoteId = :noteId', { noteId })
				.leftJoinAndSelect('note.user', 'user');
			const replies = await query.getMany();

			return [
				replies,
				...await Promise.all(replies.map(reply => recursive(reply.id))),
			].flat();
		};

		const cascadingNotes: MiNote[] = await recursive(note.id);

		return cascadingNotes;
	}
}
