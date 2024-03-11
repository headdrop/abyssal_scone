/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import si from 'systeminformation';
import Xev from 'xev';
import * as osUtils from 'os-utils';
import * as Redis from 'ioredis';
import { DI } from '@/di-symbols.js';
import { bindThis } from '@/decorators.js';
import { MetaService } from '@/core/MetaService.js';
import type { GlobalEvents } from '@/core/GlobalEventService.js';
import type { OnApplicationShutdown } from '@nestjs/common';

const ev = new Xev();

const interval = 2000;

const roundCpu = (num: number) => Math.round(num * 1000) / 1000;
const round = (num: number) => Math.round(num * 10) / 10;

@Injectable()
export class ServerStatsService implements OnApplicationShutdown {
	private intervalId: NodeJS.Timeout | null = null;

	constructor(
		@Inject(DI.redisForSub)
		private redisForSub: Redis.Redis,

		private metaService: MetaService,
	) {
		this.redisForSub.on('message', this.onMessage);
	}

	@bindThis
	private async onMessage(_: string, data: string): Promise<void> {
		const obj = JSON.parse(data);

		if (obj.channel === 'internal') {
			const { type, body } = obj.message as GlobalEvents['internal']['payload'];
			switch (type) {
				case 'metaUpdated': {
					if (body.enableServerMachineStats === true) {
						await this.start();
					} else {
						this.dispose();
					}
					break;
				}
				default:
					break;
			}
		}
	}

	/**
	 * Report server stats regularly
	 */
	@bindThis
	public async start(): Promise<void> {
		if (!(await this.metaService.fetch(true)).enableServerMachineStats) return;
		if (this.intervalId !== null) return;

		const log = [] as any[];

		ev.on('requestServerStatsLog', x => {
			// skip when service deactivated
			if (this.intervalId === null) return;

			ev.emit(`serverStatsLog:${x.id}`, log.slice(0, x.length ?? 50));
		});

		const tick = async () => {
			const cpu = await cpuUsage();
			const memStats = await mem();
			const netStats = await net();
			const fsStats = await fs();

			const stats = {
				cpu: roundCpu(cpu),
				mem: {
					used: round(memStats.total - memStats.available),
					active: round(memStats.active),
				},
				net: {
					rx: round(Math.max(0, netStats.rx_sec)),
					tx: round(Math.max(0, netStats.tx_sec)),
				},
				fs: {
					r: round(Math.max(0, fsStats.rIO_sec ?? 0)),
					w: round(Math.max(0, fsStats.wIO_sec ?? 0)),
				},
			};
			ev.emit('serverStats', stats);
			log.unshift(stats);
			if (log.length > 200) log.pop();
		};

		tick();

		this.intervalId = setInterval(tick, interval);
	}

	@bindThis
	public dispose(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	@bindThis
	public onApplicationShutdown(signal?: string | undefined): void {
		this.dispose();
	}
}

// CPU STAT
function cpuUsage(): Promise<number> {
	return new Promise((res, rej) => {
		osUtils.cpuUsage((cpuUsage) => {
			res(cpuUsage);
		});
	});
}

// MEMORY STAT
async function mem() {
	const data = await si.mem();
	return data;
}

// NETWORK STAT
async function net() {
	const iface = await si.networkInterfaceDefault();
	const data = await si.networkStats(iface);
	return data[0];
}

// FS STAT
async function fs() {
	return await si.disksIO().catch(() => ({ rIO_sec: 0, wIO_sec: 0 }));
}
