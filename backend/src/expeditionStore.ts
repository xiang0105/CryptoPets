import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type {
  ExpeditionAction,
  ExpeditionDetails,
  ExpeditionEventResult,
  ExpeditionLogEntry,
  ExpeditionPetSnapshot,
  ExpeditionRecord,
  ExpeditionReward,
  ExpeditionStatus,
  ExpeditionType
} from './expeditionTypes.js'

export interface NonceRecord {
  nonce: string
  wallet: string
  action: ExpeditionAction
  payloadHash: string
  message: string
  expiresAt: string
  usedAt: string | null
  createdAt: string
}

interface ExpeditionRow {
  id: string
  wallet: string
  pet_ids: string
  expedition_type: ExpeditionType
  started_at: string
  ends_at: string
  claimed_at: string | null
  status: ExpeditionStatus
  total_level: number
  sum_iv: number
  pet_snapshot: string
  events: string
  reward: string | null
  material_mint_tx_hash: string | null
}

interface ExpeditionLogRow {
  id: string
  expedition_id: string | null
  occurred_at: string
  message_zh: string
  message_en: string
  variant: 'notice' | null
}

interface NonceRow {
  nonce: string
  wallet: string
  action: ExpeditionAction
  payload_hash: string
  message: string
  expires_at: string
  used_at: string | null
  created_at: string
}

export class ExpeditionStore {
  private db: Database.Database

  constructor(dbPath: string) {
    const resolvedPath = resolve(dbPath)

    if (dbPath !== ':memory:') {
      const directory = dirname(resolvedPath)
      if (!existsSync(directory)) {
        mkdirSync(directory, { recursive: true })
      }
    }

    this.db = new Database(dbPath === ':memory:' ? dbPath : resolvedPath)
    this.db.pragma('journal_mode = WAL')
    this.initialize()
  }

  close() {
    this.db.close()
  }

  createNonce(record: NonceRecord) {
    this.db.prepare(`
      insert into auth_nonces (nonce, wallet, action, payload_hash, message, expires_at, used_at, created_at)
      values (@nonce, @wallet, @action, @payloadHash, @message, @expiresAt, @usedAt, @createdAt)
    `).run(record)
  }

  getNonce(nonce: string): NonceRecord | null {
    const row = this.db.prepare('select * from auth_nonces where nonce = ?').get(nonce) as NonceRow | undefined
    return row ? mapNonce(row) : null
  }

  markNonceUsed(nonce: string, usedAt: string) {
    this.db.prepare('update auth_nonces set used_at = ? where nonce = ? and used_at is null').run(usedAt, nonce)
  }

  getActiveExpedition(wallet: string): ExpeditionDetails | null {
    const row = this.db
      .prepare("select * from expeditions where wallet = ? and status = 'started' order by started_at desc limit 1")
      .get(wallet) as ExpeditionRow | undefined

    return row ? this.toDetails(row) : null
  }

  getExpedition(expeditionId: string): ExpeditionDetails | null {
    const row = this.db.prepare('select * from expeditions where id = ?').get(expeditionId) as ExpeditionRow | undefined
    return row ? this.toDetails(row) : null
  }

  createExpedition(record: ExpeditionRecord, logs: ExpeditionLogEntry[]) {
    const insertExpedition = this.db.prepare(`
      insert into expeditions (
        id, wallet, pet_ids, expedition_type, started_at, ends_at, claimed_at, status,
        total_level, sum_iv, pet_snapshot, events, reward, material_mint_tx_hash
      )
      values (
        @id, @wallet, @petIds, @expeditionType, @startedAt, @endsAt, @claimedAt, @status,
        @totalLevel, @sumIv, @petSnapshot, @events, @reward, @materialMintTxHash
      )
    `)
    const insertLog = this.db.prepare(`
      insert into expedition_logs (id, wallet, expedition_id, occurred_at, message_zh, message_en, variant)
      values (@id, @wallet, @expeditionId, @at, @messageZh, @messageEn, @variant)
    `)
    const transaction = this.db.transaction(() => {
      insertExpedition.run({
        ...record,
        petIds: JSON.stringify(record.petIds),
        petSnapshot: JSON.stringify(record.petSnapshot),
        events: JSON.stringify(record.events),
        reward: record.reward ? JSON.stringify(record.reward) : null,
        materialMintTxHash: record.materialMintTxHash
      })

      for (const log of logs) {
        insertLog.run({
          id: log.id,
          wallet: record.wallet,
          expeditionId: log.expeditionId,
          at: log.at,
          messageZh: log.message.zh,
          messageEn: log.message.en,
          variant: log.variant
        })
      }
    })

    transaction()
  }

  markClaimed(input: { expeditionId: string; claimedAt: string; reward: ExpeditionReward; materialMintTxHash: string | null }) {
    this.db.prepare(`
      update expeditions
      set status = 'claimed', claimed_at = @claimedAt, reward = @reward, material_mint_tx_hash = @materialMintTxHash
      where id = @expeditionId and status = 'started'
    `).run({
      expeditionId: input.expeditionId,
      claimedAt: input.claimedAt,
      reward: JSON.stringify(input.reward),
      materialMintTxHash: input.materialMintTxHash
    })
  }

  addLog(wallet: string, log: ExpeditionLogEntry) {
    this.db.prepare(`
      insert into expedition_logs (id, wallet, expedition_id, occurred_at, message_zh, message_en, variant)
      values (@id, @wallet, @expeditionId, @at, @messageZh, @messageEn, @variant)
    `).run({
      id: log.id,
      wallet,
      expeditionId: log.expeditionId,
      at: log.at,
      messageZh: log.message.zh,
      messageEn: log.message.en,
      variant: log.variant
    })
  }

  listLogs(wallet: string): ExpeditionLogEntry[] {
    const rows = this.db
      .prepare('select * from expedition_logs where wallet = ? order by occurred_at asc, id asc limit 100')
      .all(wallet) as ExpeditionLogRow[]

    return rows.map(mapLog)
  }

  listLogsByExpedition(expeditionId: string): ExpeditionLogEntry[] {
    const rows = this.db
      .prepare('select * from expedition_logs where expedition_id = ? order by occurred_at asc, id asc')
      .all(expeditionId) as ExpeditionLogRow[]

    return rows.map(mapLog)
  }

  private toDetails(row: ExpeditionRow): ExpeditionDetails {
    const record: ExpeditionRecord = {
      id: row.id,
      wallet: row.wallet,
      petIds: JSON.parse(row.pet_ids) as string[],
      expeditionType: row.expedition_type,
      startedAt: row.started_at,
      endsAt: row.ends_at,
      claimedAt: row.claimed_at,
      status: row.status,
      totalLevel: row.total_level,
      sumIv: row.sum_iv,
      petSnapshot: JSON.parse(row.pet_snapshot) as ExpeditionPetSnapshot[],
      events: JSON.parse(row.events) as ExpeditionEventResult[],
      reward: row.reward ? JSON.parse(row.reward) as ExpeditionReward : null,
      materialMintTxHash: row.material_mint_tx_hash
    }

    return {
      id: record.id,
      wallet: record.wallet,
      petIds: record.petIds,
      expeditionType: record.expeditionType,
      startedAt: record.startedAt,
      endsAt: record.endsAt,
      status: record.status,
      reward: record.reward,
      totalLevel: record.totalLevel,
      sumIv: record.sumIv,
      events: record.events,
      logs: this.listLogsByExpedition(record.id),
      materialMintTxHash: record.materialMintTxHash
    }
  }

  private initialize() {
    this.db.exec(`
      create table if not exists auth_nonces (
        nonce text primary key,
        wallet text not null,
        action text not null,
        payload_hash text not null,
        message text not null,
        expires_at text not null,
        used_at text,
        created_at text not null
      );

      create table if not exists expeditions (
        id text primary key,
        wallet text not null,
        pet_ids text not null,
        expedition_type text not null,
        started_at text not null,
        ends_at text not null,
        claimed_at text,
        status text not null,
        total_level integer not null,
        sum_iv integer not null,
        pet_snapshot text not null,
        events text not null,
        reward text,
        material_mint_tx_hash text
      );

      create table if not exists expedition_logs (
        id text primary key,
        wallet text not null,
        expedition_id text,
        occurred_at text not null,
        message_zh text not null,
        message_en text not null,
        variant text
      );

      create index if not exists auth_nonces_wallet_idx on auth_nonces(wallet);
      create index if not exists expeditions_wallet_status_idx on expeditions(wallet, status);
      create index if not exists expedition_logs_wallet_time_idx on expedition_logs(wallet, occurred_at);
      create index if not exists expedition_logs_expedition_time_idx on expedition_logs(expedition_id, occurred_at);
    `)
  }
}

function mapNonce(row: NonceRow): NonceRecord {
  return {
    nonce: row.nonce,
    wallet: row.wallet,
    action: row.action,
    payloadHash: row.payload_hash,
    message: row.message,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    createdAt: row.created_at
  }
}

function mapLog(row: ExpeditionLogRow): ExpeditionLogEntry {
  return {
    id: row.id,
    expeditionId: row.expedition_id,
    at: row.occurred_at,
    message: {
      zh: row.message_zh,
      en: row.message_en
    },
    variant: row.variant
  }
}
