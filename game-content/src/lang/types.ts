export type LocaleCode = 'zh-TW' | 'en'

export interface AppMessages {
  nav: {
    home: string
    pet: string
    store: string
    inventory: string
  }
  actions: {
    music: string
    musicOn: string
    musicOff: string
    help: string
    readme: string
    wallet: string
    monoMode: string
    switchLanguage: string
  }
  login: {
    walletPlaceholder: string
    confirm: string
    walletDetected: string
    openingWallet: string
    walletConnected: string
    walletFailed: string
  }
  paging: {
    previous: string
    next: string
  }
  help: {
    title: string
    markdown: string
  }
  readme: {
    title: string
    markdown: string
  }
  starterGift: {
    title: string
    body: string
    accept: string
    listLabel: string
  }
}

export interface HomeMessages {
  activeExpedition: string
  missionName: string
  progress: string
  ready: string
  nextEvent: string
  goal: string
  chooseForest: string
  start: string
  completed: string
  exploring: string
  currentStatus: string
  expeditionLog: string
  partyTitle: string
  level: string
  hp: string
  exp: string
  iv: string
  atk: string
  def: string
  id: string
  routeStrong: string
  routeSteady: string
  routeWeak: string
}

export interface StoreMessages {
  previousArea: string
  nextArea: string
  animation: string
  listItem: string
  sellGoodies: string
  inventoryTitle: string
  inventoryHint: string
  price: string
  listSelected: string
  emptyListings: string
  overview: string
  activeListings: string
  transactions: string
  reputation: string
  buy: string
  bought: string
  sold: string
  listed: string
  sepolia: string
  remove: string
  removeTitle: string
  removeBody: string
  cancel: string
  confirmRemove: string
  noMaterial: string
  select: string
  close: string
}

export interface InventoryMessages {
  title: string
  sepolia: string
  gridLabel: string
  emptySlot: string
  loading: string
  loadFailed: string
  retry: string
  notSynced: string
  syncedAt: string
  details: string
  materialInfo: string
  emptyName: string
  emptyDescription: string
  stackLimit: string
  value: string
  origin: string
  chainReserved: string
  discard: string
  use: string
  sellAll: string
}

export interface PetsMessages {
  teamTitle: string
  expeditionTeam: string
  leader: string
  filterSort: string
  addTeam: string
  removeTeam: string
  stationTitle: string
  level: string
  hp: string
  exp: string
  expUpgrade: string
  intro: string
  skillDesign: string
  upgrade: string
  skillUpgrade: string
  basicData: string
  autoNurture: string
  predictedLevel: string
  nextLevel: string
  requiredExp: string
  skillPoints: string
  fruitExp: string
  stageBreakthrough: string
  breakthroughReady: string
  breakthroughLocked: string
  addPoint: string
  napAttack: string
  bash: string
  forage: string
  emptyPet: string
  element: string
  owner: string
  token: string
  atk: string
  def: string
  stage: string
  birth: string
  animation: string
  confirmUpgrade: string
  confirmBreakthrough: string
}

export interface GameMessages {
  app: AppMessages
  home: HomeMessages
  store: StoreMessages
  inventory: InventoryMessages
  pets: PetsMessages
}
