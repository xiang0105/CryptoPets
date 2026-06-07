const { expect } = require('chai')
const { createChain, deployContract, expectRevert, getRawBalance, mine } = require('./helpers.cjs')

describe('CryptoPets', function () {
  let provider
  let owner
  let alice
  let bob
  let attacker
  let pets

  beforeEach(async function () {
    ;({ provider, signers: [owner, alice, bob, attacker] } = await createChain())
    pets = await deployContract('CryptoPets', owner)
  })

  it('only owner can create pets and set pet level', async function () {
    const aliceAddress = await alice.getAddress()

    await mine(pets.addPet('momo', aliceAddress, 88))

    expect(await pets.ownerOf(1n)).to.equal(aliceAddress)
    expect(await pets.balanceOf(aliceAddress)).to.equal(1n)

    let attribute = await pets.connect(alice).getPetAttribute(1n)
    expect(attribute[1]).to.equal('momo')
    expect(attribute[2]).to.equal(88n)
    expect(attribute[3]).to.equal(1n)
    expect(attribute[4]).to.equal(0n)

    await mine(pets.setPetLevel(1n, 7n))
    attribute = await pets.connect(alice).getPetAttribute(1n)
    expect(attribute[3]).to.equal(7n)

    await expectRevert(
      pets.connect(alice).addPet('bad', aliceAddress, 1),
      'not owner',
    )
    await expectRevert(
      pets.connect(alice).setPetLevel(1n, 9n),
      'not owner',
    )
    await expectRevert(
      pets.setPetLevel(1n, 0n),
      'zero level',
    )
  })

  it('transfers pet ownership while preserving pet attributes', async function () {
    const aliceAddress = await alice.getAddress()
    const bobAddress = await bob.getAddress()

    await mine(pets.addPet('momo', aliceAddress, 88))
    await mine(pets.setPetLevel(1n, 5n))
    await mine(pets.connect(alice).transferFrom(aliceAddress, bobAddress, 1n))

    expect(await pets.ownerOf(1n)).to.equal(bobAddress)
    expect(await pets.balanceOf(aliceAddress)).to.equal(0n)
    expect(await pets.balanceOf(bobAddress)).to.equal(1n)

    await expectRevert(
      pets.connect(alice).getPetAttribute(1n),
      'not pet owner',
    )

    const attribute = await pets.connect(bob).getPetAttribute(1n)
    expect(attribute[1]).to.equal('momo')
    expect(attribute[2]).to.equal(88n)
    expect(attribute[3]).to.equal(5n)
  })

  it('protects cloth transfer with ERC721 ownership or approval', async function () {
    const aliceAddress = await alice.getAddress()
    const bobAddress = await bob.getAddress()

    await mine(pets.addPet('from-pet', aliceAddress, 10))
    await mine(pets.addPet('to-pet', bobAddress, 11))
    await mine(pets.addCloth(2, aliceAddress, 1n))

    await expectRevert(
      pets.connect(attacker).sellCloth(2, aliceAddress, bobAddress, 1n, 2n),
      'not approved',
    )

    await mine(pets.connect(alice).sellCloth(2, aliceAddress, bobAddress, 1n, 2n))

    const source = await pets.connect(alice).getPet(1n)
    const target = await pets.connect(bob).getPetAttribute(2n)
    expect(source[4]).to.equal(0n)
    expect(target[4]).to.equal(4n)

    await expectRevert(
      pets.connect(alice).sellCloth(2, aliceAddress, bobAddress, 1n, 2n),
    )
  })

  it('lets approved operators move cloth', async function () {
    const aliceAddress = await alice.getAddress()
    const bobAddress = await bob.getAddress()
    const attackerAddress = await attacker.getAddress()

    await mine(pets.addPet('from-pet', aliceAddress, 10))
    await mine(pets.addPet('to-pet', bobAddress, 11))
    await mine(pets.addCloth(1, aliceAddress, 1n))
    await mine(pets.connect(alice).approve(attackerAddress, 1n))
    await mine(pets.connect(attacker).sellCloth(1, aliceAddress, bobAddress, 1n, 2n))

    const target = await pets.connect(bob).getPetAttribute(2n)
    expect(target[4]).to.equal(2n)
  })

  it('supports listing, buying, cancelling stale listing, and exact-price enforcement', async function () {
    const aliceAddress = await alice.getAddress()
    const bobAddress = await bob.getAddress()
    const price = 1000n

    await mine(pets.addPet('market-pet', aliceAddress, 50))

    await expectRevert(
      pets.connect(bob).listPet(1n, price),
      'not pet owner',
    )

    await mine(pets.connect(alice).listPet(1n, price))
    let listing = await pets.petListings(1n)
    expect(listing[0]).to.equal(aliceAddress)
    expect(listing[1]).to.equal(price)

    await expectRevert(
      pets.connect(bob).buyPet(1n, { value: price - 1n }),
      'wrong price',
    )

    const sellerBalanceBefore = await getRawBalance(provider, aliceAddress)
    await mine(pets.connect(bob).buyPet(1n, { value: price }))
    const sellerBalanceAfter = await getRawBalance(provider, aliceAddress)

    expect(await pets.ownerOf(1n)).to.equal(bobAddress)
    expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(price)

    listing = await pets.petListings(1n)
    expect(listing[1]).to.equal(0n)
  })

  it('automatically clears a pet listing when the pet is transferred outside buyPet', async function () {
    const aliceAddress = await alice.getAddress()
    const bobAddress = await bob.getAddress()

    await mine(pets.addPet('stale-pet', aliceAddress, 77))
    await mine(pets.connect(alice).listPet(1n, 100n))
    await mine(pets.connect(alice).transferFrom(aliceAddress, bobAddress, 1n))

    const listing = await pets.petListings(1n)
    expect(listing[1]).to.equal(0n)

    await expectRevert(
      pets.connect(attacker).buyPet(1n, { value: 100n }),
      'not listed',
    )
  })

  it('prevents buyPet from transferring a pet into a contract that does not implement IERC721Receiver', async function () {
    const aliceAddress = await alice.getAddress()
    const buyer = await deployContract('NonReceiverPetBuyer', bob)

    await mine(pets.addPet('stuck-pet', aliceAddress, 99))
    await mine(pets.connect(alice).listPet(1n, 100n))

    await expectRevert(
      buyer.connect(bob).buyPet(await pets.getAddress(), 1n, { value: 100n }),
      'unsafe receiver',
    )

    expect(await pets.ownerOf(1n)).to.equal(aliceAddress)
  })
})
