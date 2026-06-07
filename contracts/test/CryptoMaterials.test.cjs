const { expect } = require('chai')
const { createChain, deployContract, expectRevert, getRawBalance, mine } = require('./helpers.cjs')

describe('CryptoMaterials', function () {
  let provider
  let owner
  let alice
  let bob
  let attacker
  let materials

  beforeEach(async function () {
    ;({ provider, signers: [owner, alice, bob, attacker] } = await createChain())
    materials = await deployContract('CryptoMaterials', owner)
  })

  it('lets only owner increase and decrease material balances', async function () {
    const aliceAddress = await alice.getAddress()

    await mine(materials.increaseMaterial(aliceAddress, 1n, 10n))
    expect(await materials.balanceOf(aliceAddress, 1n)).to.equal(10n)

    await mine(materials.decreaseMaterial(aliceAddress, 1n, 3n))
    expect(await materials.balanceOf(aliceAddress, 1n)).to.equal(7n)

    await expectRevert(
      materials.connect(alice).increaseMaterial(aliceAddress, 1n, 1n),
      'not owner',
    )
    await expectRevert(
      materials.connect(alice).decreaseMaterial(aliceAddress, 1n, 1n),
      'not owner',
    )
    await expectRevert(
      materials.decreaseMaterial(aliceAddress, 1n, 99n),
      'not enough material',
    )
    await expectRevert(
      materials.increaseMaterial(aliceAddress, 1n, 0n),
      'zero amount',
    )
  })

  it('supports ERC1155 transfers and operator approval', async function () {
    const aliceAddress = await alice.getAddress()
    const bobAddress = await bob.getAddress()

    await mine(materials.increaseMaterial(aliceAddress, 1n, 10n))

    await expectRevert(
      materials.connect(bob).safeTransferFrom(aliceAddress, bobAddress, 1n, 1n, '0x'),
      'not approved',
    )

    await mine(materials.connect(alice).setApprovalForAll(bobAddress, true))
    await mine(materials.connect(bob).safeTransferFrom(aliceAddress, bobAddress, 1n, 2n, '0x'))

    expect(await materials.balanceOf(aliceAddress, 1n)).to.equal(8n)
    expect(await materials.balanceOf(bobAddress, 1n)).to.equal(2n)
  })

  it('escrows material on list and returns it on cancel', async function () {
    const aliceAddress = await alice.getAddress()
    const bobAddress = await bob.getAddress()
    const contractAddress = await materials.getAddress()

    await mine(materials.increaseMaterial(aliceAddress, 1n, 10n))
    await mine(materials.connect(alice).listMaterial(1n, 4n, 100n))

    expect(await materials.materialListingId()).to.equal(1n)
    expect(await materials.balanceOf(aliceAddress, 1n)).to.equal(6n)
    expect(await materials.balanceOf(contractAddress, 1n)).to.equal(4n)

    await expectRevert(
      materials.connect(bob).cancelMaterialListing(1n),
      'not seller',
    )

    await mine(materials.connect(alice).cancelMaterialListing(1n))
    const listing = await materials.materialListings(1n)
    expect(listing[4]).to.equal(false)
    expect(await materials.balanceOf(aliceAddress, 1n)).to.equal(10n)
    expect(await materials.balanceOf(contractAddress, 1n)).to.equal(0n)

    expect(bobAddress).to.match(/^0x[a-fA-F0-9]{40}$/)
  })

  it('supports exact-price material purchases from escrow', async function () {
    const aliceAddress = await alice.getAddress()
    const bobAddress = await bob.getAddress()
    const contractAddress = await materials.getAddress()
    const price = 500n

    await mine(materials.increaseMaterial(aliceAddress, 1n, 10n))
    await mine(materials.connect(alice).listMaterial(1n, 4n, price))

    await expectRevert(
      materials.connect(bob).buyMaterial(1n, { value: price - 1n }),
      'wrong price',
    )

    const sellerBalanceBefore = await getRawBalance(provider, aliceAddress)
    await mine(materials.connect(bob).buyMaterial(1n, { value: price }))
    const sellerBalanceAfter = await getRawBalance(provider, aliceAddress)

    expect(await materials.balanceOf(bobAddress, 1n)).to.equal(4n)
    expect(await materials.balanceOf(contractAddress, 1n)).to.equal(0n)
    expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(price)

    const listing = await materials.materialListings(1n)
    expect(listing[4]).to.equal(false)

    await expectRevert(
      materials.connect(attacker).buyMaterial(1n, { value: price }),
      'not listed',
    )
  })

  it('prevents owner from burning escrowed material and stranding an active listing', async function () {
    const aliceAddress = await alice.getAddress()
    const contractAddress = await materials.getAddress()

    await mine(materials.increaseMaterial(aliceAddress, 1n, 10n))
    await mine(materials.connect(alice).listMaterial(1n, 4n, 100n))

    await expectRevert(
      materials.decreaseMaterial(contractAddress, 1n, 4n),
      'escrow protected',
    )

    const listing = await materials.materialListings(1n)
    expect(listing[4]).to.equal(true)
    expect(await materials.balanceOf(contractAddress, 1n)).to.equal(4n)

    await mine(materials.connect(alice).cancelMaterialListing(1n))
    expect(await materials.balanceOf(aliceAddress, 1n)).to.equal(10n)
  })
})
