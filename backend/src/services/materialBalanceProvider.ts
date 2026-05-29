import type { InventoryItem } from '@cryptopets/shared'
import { supabase } from '../config/supabase.js'
import { HttpError } from '../utils/httpError.js'

export interface MaterialBalanceProvider {
  listBalances(userId: string): Promise<InventoryItem[]>
  increase(userId: string, materialId: string, amount: number): Promise<void>
  decrease(userId: string, materialId: string, amount: number): Promise<void>
  transfer(fromUserId: string, toUserId: string, materialId: string, amount: number): Promise<void>
}

export class SupabaseMaterialBalanceProvider implements MaterialBalanceProvider {
  async listBalances(userId: string): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory')
      .select('material_id,amount,updated_at')
      .eq('user_id', userId)
      .order('material_id')

    if (error) {
      throw new HttpError(500, 'INVENTORY_LOOKUP_FAILED')
    }

    return (data ?? []).map((item) => ({
      materialId: item.material_id,
      amount: item.amount,
      updatedAt: item.updated_at,
    }))
  }

  async increase(userId: string, materialId: string, amount: number): Promise<void> {
    await this.change(userId, materialId, amount)
  }

  async decrease(userId: string, materialId: string, amount: number): Promise<void> {
    await this.change(userId, materialId, -amount)
  }

  async transfer(fromUserId: string, toUserId: string, materialId: string, amount: number): Promise<void> {
    await this.decrease(fromUserId, materialId, amount)

    try {
      await this.increase(toUserId, materialId, amount)
    } catch (error) {
      await this.increase(fromUserId, materialId, amount)
      throw error
    }
  }

  private async change(userId: string, materialId: string, delta: number): Promise<void> {
    const { data, error } = await supabase
      .from('inventory')
      .select('amount')
      .eq('user_id', userId)
      .eq('material_id', materialId)
      .maybeSingle()

    if (error) {
      throw new HttpError(500, 'INVENTORY_LOOKUP_FAILED')
    }

    const nextAmount = (data?.amount ?? 0) + delta

    if (nextAmount < 0) {
      throw new HttpError(409, 'INSUFFICIENT_MATERIAL')
    }

    const { error: updateError } = await supabase.from('inventory').upsert({
      user_id: userId,
      material_id: materialId,
      amount: nextAmount,
      updated_at: new Date().toISOString(),
    })

    if (updateError) {
      throw new HttpError(500, 'INVENTORY_UPDATE_FAILED')
    }
  }
}

export const materialBalanceProvider: MaterialBalanceProvider = new SupabaseMaterialBalanceProvider()
