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
import type { MarketListing, PlayerTransaction, WalletAddress } from '@cryptopets/shared'

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

export interface StarterPetGrantRecord {
  wallet: string
  petNames: string[]
  ivs: number[]
  txHashes: string[]
  grantedAt: string
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

interface StarterPetGrantRow {
  wallet: string
  pet_names: string
  ivs: string
  tx_hashes: string
  granted_at: string
}

interface MarketListingRow {
  id: string
  seller_id: string
  seller_wallet: string
  material_id: string
  amount: number
  price: number
  status: MarketListing['status']
  buyer_id: string | null
  created_at: string
  updated_at: string
}

interface PlayerTransactionRow {
  id: string
  wallet: string
  action: PlayerTransaction['action']
  material_id: string | null
  material_amount: number | null
  sepolia_amount: string
  created_at: string
}

export interface PetExperienceRecord {
  tokenId: string
  current: number
  next: number
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

  getStarterPetGrant(wallet: string): StarterPetGrantRecord | null {
    const row = this.db.prepare('select * from starter_pet_grants where wallet = ?').get(wallet) as StarterPetGrantRow | undefined
    return row ? mapStarterPetGrant(row) : null
  }

  createStarterPetGrant(record: StarterPetGrantRecord) {
    this.db.prepare(`
      insert into starter_pet_grants (wallet, pet_names, ivs, tx_hashes, granted_at)
      values (@wallet, @petNames, @ivs, @txHashes, @grantedAt)
    `).run({
      wallet: record.wallet,
      petNames: JSON.stringify(record.petNames),
      ivs: JSON.stringify(record.ivs),
      txHashes: JSON.stringify(record.txHashes),
      grantedAt: record.grantedAt
    })
  }

  createMarketListing(input: {
    id: string
    sellerWallet: string
    materialId: string
    amount: number
    price: number
    now: string
  }): MarketListing {
    const listing: MarketListing = {
      id: input.id,
      sellerId: input.sellerWallet,
      sellerWallet: input.sellerWallet as WalletAddress,
      materialId: input.materialId,
      amount: input.amount,
      price: input.price,
      status: 'active',
      buyerId: null,
      createdAt: input.now,
      updatedAt: input.now
    }

    const transaction: PlayerTransaction = {
      id: `${input.id}-list`,
      action: 'list',
      materialId: input.materialId,
      materialAmount: input.amount,
      sepoliaAmount: '0',
      createdAt: input.now
    }

    const insertListing = this.db.prepare(`
      insert into market_material_listings (
        id, seller_id, seller_wallet, material_id, amount, price, status, buyer_id, created_at, updated_at
      )
      values (@id, @sellerId, @sellerWallet, @materialId, @amount, @price, @status, @buyerId, @createdAt, @updatedAt)
    `)
    const insertTransaction = this.db.prepare(`
      insert into player_transactions (id, wallet, action, material_id, material_amount, sepolia_amount, created_at)
      values (@id, @wallet, @action, @materialId, @materialAmount, @sepoliaAmount, @createdAt)
    `)

    const transactionRunner = this.db.transaction(() => {
      insertListing.run(listing)
      insertTransaction.run({
        ...transaction,
        wallet: input.sellerWallet
      })
    })

    transactionRunner()
    return listing
  }

  getMarketListing(listingId: string): MarketListing | null {
    const row = this.db.prepare('select * from market_material_listings where id = ?').get(listingId) as MarketListingRow | undefined
    return row ? mapMarketListing(row) : null
  }

  listMarketListings(): MarketListing[] {
    const rows = this.db
      .prepare("select * from market_material_listings where status in ('active', 'pending') order by created_at desc, id desc")
      .all() as MarketListingRow[]

    return rows.map(mapMarketListing)
  }

  getReservedMaterialAmounts(wallet: string): Record<string, number> {
    const rows = this.db
      .prepare(`
        select material_id, sum(amount) as amount
        from market_material_listings
        where seller_wallet = ? and status in ('active', 'pending')
        group by material_id
      `)
      .all(wallet) as Array<{ material_id: string; amount: number | null }>

    return Object.fromEntries(rows.map((row) => [row.material_id, row.amount ?? 0]))
  }

  cancelMarketListing(input: { listingId: string; sellerWallet: string; now: string }): MarketListing | null {
    const existing = this.getMarketListing(input.listingId)

    if (!existing || existing.status !== 'active' || existing.sellerWallet?.toLowerCase() !== input.sellerWallet.toLowerCase()) {
      return null
    }

    this.db.prepare(`
      update market_material_listings
      set status = 'cancelled', updated_at = ?
      where id = ? and status = 'active'
    `).run(input.now, input.listingId)
    return this.getMarketListing(input.listingId)
  }

  completeMarketPurchase(input: { listingId: string; buyerWallet: string; now: string }): MarketListing | null {
    const existing = this.getMarketListing(input.listingId)

    if (!existing || existing.status !== 'active' || existing.sellerWallet?.toLowerCase() === input.buyerWallet.toLowerCase()) {
      return null
    }

    const buyTransaction: PlayerTransaction = {
      id: `${input.listingId}-buy-${Date.now()}`,
      action: 'buy',
      materialId: existing.materialId,
      materialAmount: existing.amount,
      sepoliaAmount: `-${existing.price}`,
      createdAt: input.now
    }
    const sellTransaction: PlayerTransaction = {
      id: `${input.listingId}-sell-${Date.now()}`,
      action: 'sell',
      materialId: existing.materialId,
      materialAmount: existing.amount,
      sepoliaAmount: `${existing.price}`,
      createdAt: input.now
    }

    const insertTransaction = this.db.prepare(`
      insert into player_transactions (id, wallet, action, material_id, material_amount, sepolia_amount, created_at)
      values (@id, @wallet, @action, @materialId, @materialAmount, @sepoliaAmount, @createdAt)
    `)
    const transactionRunner = this.db.transaction(() => {
      this.db.prepare(`
        update market_material_listings
        set status = 'sold', buyer_id = ?, updated_at = ?
        where id = ? and status = 'active'
      `).run(input.buyerWallet, input.now, input.listingId)
      insertTransaction.run({
        ...buyTransaction,
        wallet: input.buyerWallet
      })
      insertTransaction.run({
        ...sellTransaction,
        wallet: existing.sellerWallet
      })
    })

    transactionRunner()
    return this.getMarketListing(input.listingId)
  }

  listPlayerTransactions(wallet: string): PlayerTransaction[] {
    const rows = this.db
      .prepare("select * from player_transactions where wallet = ? and action <> 'cancel' order by created_at desc, id desc limit 100")
      .all(wallet) as PlayerTransactionRow[]

    return rows.map(mapPlayerTransaction)
  }

  addPetExperience(input: { wallet: string; tokenIds: string[]; exp: number; now: string; expCap?: number; expNext?: number }) {
    const expCap = input.expCap ?? 99
    const expNext = input.expNext ?? 100
    const rows = this.getWalletPetExperience(input.wallet)
    const upsert = this.db.prepare(`
      insert into pet_experience (wallet, token_id, current_exp, next_exp, updated_at)
      values (@wallet, @tokenId, @currentExp, @nextExp, @updatedAt)
      on conflict(wallet, token_id) do update set
        current_exp = excluded.current_exp,
        next_exp = excluded.next_exp,
        updated_at = excluded.updated_at
    `)

    const transactionRunner = this.db.transaction(() => {
      for (const tokenId of input.tokenIds) {
        const existing = rows[tokenId]?.current ?? 0
        upsert.run({
          wallet: input.wallet,
          tokenId,
          currentExp: Math.min(expCap, Math.max(0, existing + input.exp)),
          nextExp: expNext,
          updatedAt: input.now
        })
      }
    })

    transactionRunner()
  }

  getWalletPetExperience(wallet: string): Record<string, { current: number; next: number }> {
    const rows = this.db
      .prepare('select token_id, current_exp, next_exp from pet_experience where wallet = ?')
      .all(wallet) as Array<{ token_id: string; current_exp: number; next_exp: number }>

    return Object.fromEntries(rows.map((row) => [row.token_id, { current: row.current_exp, next: row.next_exp }]))
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
      petSnapshot: record.petSnapshot,
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

      create table if not exists starter_pet_grants (
        wallet text primary key,
        pet_names text not null,
        ivs text not null,
        tx_hashes text not null,
        granted_at text not null
      );

      create table if not exists market_material_listings (
        id text primary key,
        seller_id text not null,
        seller_wallet text not null,
        material_id text not null,
        amount integer not null,
        price real not null,
        status text not null,
        buyer_id text,
        created_at text not null,
        updated_at text not null
      );

      create table if not exists player_transactions (
        id text primary key,
        wallet text not null,
        action text not null,
        material_id text,
        material_amount integer,
        sepolia_amount text not null,
        created_at text not null
      );

      create table if not exists pet_experience (
        wallet text not null,
        token_id text not null,
        current_exp integer not null,
        next_exp integer not null,
        updated_at text not null,
        primary key (wallet, token_id)
      );

      create index if not exists auth_nonces_wallet_idx on auth_nonces(wallet);
      create index if not exists expeditions_wallet_status_idx on expeditions(wallet, status);
      create index if not exists expedition_logs_wallet_time_idx on expedition_logs(wallet, occurred_at);
      create index if not exists expedition_logs_expedition_time_idx on expedition_logs(expedition_id, occurred_at);
      create index if not exists market_material_listings_status_idx on market_material_listings(status, created_at);
      create index if not exists market_material_listings_seller_idx on market_material_listings(seller_wallet, status);
      create index if not exists player_transactions_wallet_time_idx on player_transactions(wallet, created_at);
      create index if not exists pet_experience_wallet_idx on pet_experience(wallet);
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

function mapStarterPetGrant(row: StarterPetGrantRow): StarterPetGrantRecord {
  return {
    wallet: row.wallet,
    petNames: JSON.parse(row.pet_names) as string[],
    ivs: JSON.parse(row.ivs) as number[],
    txHashes: JSON.parse(row.tx_hashes) as string[],
    grantedAt: row.granted_at
  }
}

function mapMarketListing(row: MarketListingRow): MarketListing {
  return {
    id: row.id,
    sellerId: row.seller_id,
    sellerWallet: row.seller_wallet as WalletAddress,
    materialId: row.material_id,
    amount: row.amount,
    price: row.price,
    status: row.status,
    buyerId: row.buyer_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapPlayerTransaction(row: PlayerTransactionRow): PlayerTransaction {
  return {
    id: row.id,
    action: row.action,
    materialId: row.material_id,
    materialAmount: row.material_amount,
    sepoliaAmount: row.sepolia_amount,
    createdAt: row.created_at
  }
}
