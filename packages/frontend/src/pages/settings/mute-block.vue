<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<SearchMarker path="/settings/mute-block" :label="i18n.ts.muteAndBlock" icon="ti ti-ban" :keywords="['mute', 'block']">
	<div class="_gaps_m">
		<SearchMarker
			:label="i18n.ts.wordMute"
			:keywords="['note', 'word', 'soft', 'mute', 'hide']"
		>
			<MkFolder>
				<template #icon><i class="ti ti-message-off"></i></template>
				<template #label>{{ i18n.ts.wordMute }}</template>

				<div class="_gaps_m">
					<MkInfo>{{ i18n.ts.wordMuteDescription }}</MkInfo>

					<SearchMarker
						:label="i18n.ts.showMutedWord"
						:keywords="['show']"
					>
						<MkSwitch v-model="showSoftWordMutedWord">{{ i18n.ts.showMutedWord }}</MkSwitch>
					</SearchMarker>

					<XWordMute :muted="$i.mutedWords" @save="saveMutedWords"/>
				</div>
			</MkFolder>
		</SearchMarker>

		<SearchMarker
			:label="i18n.ts.hardWordMute"
			:keywords="['note', 'word', 'hard', 'mute', 'hide']"
		>
			<MkFolder>
				<template #icon><i class="ti ti-message-off"></i></template>
				<template #label>{{ i18n.ts.hardWordMute }}</template>

				<div class="_gaps_m">
					<MkInfo>{{ i18n.ts.hardWordMuteDescription }}</MkInfo>
					<XWordMute :muted="$i.hardMutedWords" @save="saveHardMutedWords"/>
				</div>
			</MkFolder>
		</SearchMarker>

		<SearchMarker
			:label="i18n.ts.instanceMute"
			:keywords="['note', 'server', 'instance', 'host', 'federation', 'mute', 'hide']"
		>
			<MkFolder v-if="instance.federation !== 'none'">
				<template #icon><i class="ti ti-planet-off"></i></template>
				<template #label>{{ i18n.ts.instanceMute }}</template>

				<XInstanceMute/>
			</MkFolder>
		</SearchMarker>

		<SearchMarker
			:label="`${i18n.ts.mutedUsers} (${ i18n.ts.renote })`"
			:keywords="['renote', 'mute', 'hide', 'user']"
		>
			<MkFolder>
				<template #icon><i class="ti ti-repeat-off"></i></template>
				<template #label>{{ i18n.ts.mutedUsers }} ({{ i18n.ts.renote }})</template>

				<MkPagination :pagination="renoteMutingPagination">
					<template #empty>
						<div class="_fullinfo">
							<img :src="infoImageUrl" class="_ghost"/>
							<div>{{ i18n.ts.noUsers }}</div>
						</div>
					</template>

					<template #default="{ items }">
						<div class="_gaps_s">
							<div v-for="item in items" :key="item.mutee.id" :class="[$style.userItem, { [$style.userItemOpend]: expandedRenoteMuteItems.includes(item.id) }]">
								<div :class="$style.userItemMain">
									<MkA :class="$style.userItemMainBody" :to="userPage(item.mutee)">
										<MkUserCardMini :user="item.mutee"/>
									</MkA>
									<button class="_button" :class="$style.userToggle" @click="toggleRenoteMuteItem(item)"><i :class="$style.chevron" class="ti ti-chevron-down"></i></button>
									<button class="_button" :class="$style.remove" @click="unrenoteMute(item.mutee, $event)"><i class="ti ti-x"></i></button>
								</div>
								<div v-if="expandedRenoteMuteItems.includes(item.id)" :class="$style.userItemSub">
									<div>Muted at: <MkTime :time="item.createdAt" mode="detail"/></div>
								</div>
							</div>
						</div>
					</template>
				</MkPagination>
			</MkFolder>
		</SearchMarker>

		<SearchMarker
			:label="i18n.ts.mutedUsers"
			:keywords="['note', 'mute', 'hide', 'user']"
		>
			<MkFolder>
				<template #icon><i class="ti ti-eye-off"></i></template>
				<template #label>{{ i18n.ts.mutedUsers }}</template>
				<div class="_gaps_s">
					<MkSwitch v-model="deidentifyMutedUsers">{{ i18n.ts.deidentifyMutedUsers }}</MkSwitch>

					<MkPagination :pagination="mutingPagination">
						<template #empty>
							<div class="_fullinfo">
								<img :src="infoImageUrl" class="_ghost"/>
								<div>{{ i18n.ts.noUsers }}</div>
							</div>
						</template>

						<template #default="{ items }">
							<div class="_gaps_s">
								<div v-for="item in items" :key="item.mutee.id" :class="[$style.userItem, { [$style.userItemOpend]: expandedMuteItems.includes(item.id) }]">
									<div :class="$style.userItemMain">
										<MkA :class="$style.userItemMainBody" :to="userPage(item.mutee)">
											<MkUserCardMini :user="item.mutee"/>
										</MkA>
										<button class="_button" :class="$style.userToggle" @click="toggleMuteItem(item)"><i :class="$style.chevron" class="ti ti-chevron-down"></i></button>
										<button class="_button" :class="$style.remove" @click="unmute(item.mutee, $event)"><i class="ti ti-x"></i></button>
									</div>
									<div v-if="expandedMuteItems.includes(item.id)" :class="$style.userItemSub">
										<div>Muted at: <MkTime :time="item.createdAt" mode="detail"/></div>
										<div v-if="item.expiresAt">Period: {{ new Date(item.expiresAt).toLocaleString() }}</div>
										<div v-else>Period: {{ i18n.ts.indefinitely }}</div>
									</div>
								</div>
							</div>
						</template>
					</MkPagination>
				</div>
			</MkFolder>
		</SearchMarker>

		<SearchMarker
			:label="i18n.ts.blockedUsers"
			:keywords="['block', 'user']"
		>
			<MkFolder>
				<template #icon><i class="ti ti-ban"></i></template>
				<template #label>{{ i18n.ts.blockedUsers }}</template>

				<MkPagination :pagination="blockingPagination">
					<template #empty>
						<div class="_fullinfo">
							<img :src="infoImageUrl" class="_ghost"/>
							<div>{{ i18n.ts.noUsers }}</div>
						</div>
					</template>

					<template #default="{ items }">
						<div class="_gaps_s">
							<div v-for="item in items" :key="item.blockee.id" :class="[$style.userItem, { [$style.userItemOpend]: expandedBlockItems.includes(item.id) }]">
								<div :class="$style.userItemMain">
									<MkA :class="$style.userItemMainBody" :to="userPage(item.blockee)">
										<MkUserCardMini :user="item.blockee"/>
									</MkA>
									<button class="_button" :class="$style.userToggle" @click="toggleBlockItem(item)"><i :class="$style.chevron" class="ti ti-chevron-down"></i></button>
									<button class="_button" :class="$style.remove" @click="unblock(item.blockee, $event)"><i class="ti ti-x"></i></button>
								</div>
								<div v-if="expandedBlockItems.includes(item.id)" :class="$style.userItemSub">
									<div>Blocked at: <MkTime :time="item.createdAt" mode="detail"/></div>
									<div v-if="item.expiresAt">Period: {{ new Date(item.expiresAt).toLocaleString() }}</div>
									<div v-else>Period: {{ i18n.ts.indefinitely }}</div>
								</div>
							</div>
						</div>
					</template>
				</MkPagination>
			</MkFolder>
		</SearchMarker>
	</div>
</SearchMarker>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import XInstanceMute from './mute-block.instance-mute.vue';
import XWordMute from './mute-block.word-mute.vue';
import MkPagination from '@/components/MkPagination.vue';
import { userPage } from '@/filters/user.js';
import { unisonReload } from '@/scripts/unison-reload.js';
import { i18n } from '@/i18n.js';
import { definePageMetadata } from '@/scripts/page-metadata.js';
import MkUserCardMini from '@/components/MkUserCardMini.vue';
import * as os from '@/os.js';
import { instance, infoImageUrl } from '@/instance.js';
import { signinRequired } from '@/account.js';
import MkInfo from '@/components/MkInfo.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import { defaultStore } from '@/store';
import { reloadAsk } from '@/scripts/reload-ask.js';

const deidentifyMutedUsers = computed(defaultStore.makeGetterSetter('deidentifyMutedUsers'));

watch([
	deidentifyMutedUsers,
], async () => {
	await reloadAsk({ reason: i18n.ts.reloadToApplySetting, unison: true });
});

const $i = signinRequired();

const renoteMutingPagination = {
	endpoint: 'renote-mute/list' as const,
	limit: 10,
};

const mutingPagination = {
	endpoint: 'mute/list' as const,
	limit: 10,
};

const blockingPagination = {
	endpoint: 'blocking/list' as const,
	limit: 10,
};

const expandedRenoteMuteItems = ref([]);
const expandedMuteItems = ref([]);
const expandedBlockItems = ref([]);

const showSoftWordMutedWord = computed(defaultStore.makeGetterSetter('showSoftWordMutedWord'));

watch([
	showSoftWordMutedWord,
], async () => {
	await reloadAsk({ reason: i18n.ts.reloadToApplySetting, unison: true });
});

async function unrenoteMute(user, ev) {
	os.popupMenu([{
		text: i18n.ts.renoteUnmute,
		icon: 'ti ti-x',
		action: async () => {
			await os.apiWithDialog('renote-mute/delete', { userId: user.id });
			//role.users = role.users.filter(u => u.id !== user.id);
		},
	}], ev.currentTarget ?? ev.target);
}

async function unmute(user, ev) {
	os.popupMenu([{
		text: i18n.ts.unmute,
		icon: 'ti ti-x',
		action: async () => {
			await os.apiWithDialog('mute/delete', { userId: user.id });
			//role.users = role.users.filter(u => u.id !== user.id);
		},
	}], ev.currentTarget ?? ev.target);
}

async function unblock(user, ev) {
	os.popupMenu([{
		text: i18n.ts.unblock,
		icon: 'ti ti-x',
		action: async () => {
			await os.apiWithDialog('blocking/delete', { userId: user.id });
			//role.users = role.users.filter(u => u.id !== user.id);
		},
	}], ev.currentTarget ?? ev.target);
}

async function toggleRenoteMuteItem(item) {
	if (expandedRenoteMuteItems.value.includes(item.id)) {
		expandedRenoteMuteItems.value = expandedRenoteMuteItems.value.filter(x => x !== item.id);
	} else {
		expandedRenoteMuteItems.value.push(item.id);
	}
}

async function toggleMuteItem(item) {
	if (expandedMuteItems.value.includes(item.id)) {
		expandedMuteItems.value = expandedMuteItems.value.filter(x => x !== item.id);
	} else {
		expandedMuteItems.value.push(item.id);
	}
}

async function toggleBlockItem(item) {
	if (expandedBlockItems.value.includes(item.id)) {
		expandedBlockItems.value = expandedBlockItems.value.filter(x => x !== item.id);
	} else {
		expandedBlockItems.value.push(item.id);
	}
}

async function saveMutedWords(mutedWords: (string | string[])[]) {
	await os.apiWithDialog('i/update', { mutedWords });
}

async function saveHardMutedWords(hardMutedWords: (string | string[])[]) {
	await os.apiWithDialog('i/update', { hardMutedWords });
}

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

definePageMetadata(() => ({
	title: i18n.ts.muteAndBlock,
	icon: 'ti ti-ban',
}));
</script>

<style lang="scss" module>
.userItemMain {
	display: flex;
}

.userItemSub {
	padding: 6px 12px;
	font-size: 85%;
	color: var(--MI_THEME-fgTransparentWeak);
}

.userItemMainBody {
	flex: 1;
	min-width: 0;
	margin-right: 8px;

	&:hover {
		text-decoration: none;
	}
}

.userToggle,
.remove {
	width: 32px;
	height: 32px;
	align-self: center;
}

.chevron {
	display: block;
	transition: transform 0.1s ease-out;
}

.userItem.userItemOpend {
	.chevron {
		transform: rotateX(180deg);
	}
}
</style>
