import { useEffect } from 'react';

import './App.css';
import {
  makeAgoricChainStorageWatcher,
  AgoricChainStoragePathKind as Kind,
} from '@agoric/rpc';
import { create } from 'zustand';
import {
  makeAgoricWalletConnection,
  suggestChain,
} from '@agoric/web-components';
import { subscribeLatest } from '@agoric/notifier';
import { makeCopyBag } from '@agoric/store';
import { Logos } from './components/Logos';
import { Inventory } from './components/Inventory';
import { Trade } from './components/Trade';
import { Consultation } from './components/Consultation';
import { Purchase } from './components/Purchase';

const { entries, fromEntries } = Object;

type Wallet = Awaited<ReturnType<typeof makeAgoricWalletConnection>>;

const ENDPOINTS = {
  RPC: 'http://localhost:26657',
  API: 'http://localhost:1317',
};

const codeSpaceHostName = import.meta.env.VITE_HOSTNAME;
const codeSpaceDomain = import.meta.env.VITE_GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;

if (codeSpaceHostName && codeSpaceDomain) {
  ENDPOINTS.API = `https://${codeSpaceHostName}-1317.${codeSpaceDomain}`;
  ENDPOINTS.RPC = `https://${codeSpaceHostName}-26657.${codeSpaceDomain}`;
} else {
  console.error(
    'Missing environment variables: VITE_HOSTNAME or VITE_GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN',
  );
}

const watcher = makeAgoricChainStorageWatcher(ENDPOINTS.API, 'agoriclocal');

interface AppState {
  wallet?: Wallet;
  offerUpInstance?: unknown;
  brands?: Record<string, unknown>;
  purses?: Array<Purse>;
  doctors?: Array<{ id: string; depositFacet: unknown }>;
  suppliers?: Array<{ id: string; depositFacet: unknown }>;
  patients?: Array<{ id: string; depositFacet: unknown; balance: bigint }>;
}

const useAppStore = create<AppState>(() => ({}));

const setup = async () => {
  watcher.watchLatest<Array<[string, unknown]>>(
    [Kind.Data, 'published.agoricNames.instance'],
    instances => {
      console.log('got instances', instances);
      useAppStore.setState({
        offerUpInstance: instances.find(([name]) => name === 'offerUp')!.at(1),
      });
    },
  );

  watcher.watchLatest<Array<[string, unknown]>>(
    [Kind.Data, 'published.agoricNames.brand'],
    brands => {
      console.log('Got brands', brands);
      useAppStore.setState({
        brands: fromEntries(brands),
      });
    },
  );
};

const connectWallet = async () => {
  try {
    await fetch(ENDPOINTS.RPC);
  } catch (error) {
    throw new Error('Chain is not running. Please start the chain first!');
  }
  await suggestChain('https://local.agoric.net/network-config');
  const wallet = await makeAgoricWalletConnection(watcher, ENDPOINTS.RPC);
  useAppStore.setState({ wallet });
  const { pursesNotifier } = wallet;
  for await (const purses of subscribeLatest<Purse[]>(pursesNotifier)) {
    console.log('got purses', purses);
    useAppStore.setState({ purses });
  }
};

const makeOffer = (giveValue: bigint, wantChoices: Record<string, bigint>) => {
  const { wallet, offerUpInstance, brands } = useAppStore.getState();
  if (!offerUpInstance) {
    alert('No contract instance found on the chain RPC: ' + ENDPOINTS.RPC);
    throw Error('no contract instance');
  }
  if (!(brands && brands.IST && brands.Item)) {
    alert('Brands not available');
    throw Error('brands not available');
  }

  const value = makeCopyBag(entries(wantChoices));
  const want = { Items: { brand: brands.Item, value } };
  const give = { Price: { brand: brands.IST, value: giveValue } };

  wallet?.makeOffer(
    {
      source: 'contract',
      instance: offerUpInstance,
      publicInvitationMaker: 'makeTradeInvitation',
    },
    { give, want },
    undefined,
    (update: { status: string; data?: unknown }) => {
      if (update.status === 'error') {
        alert(`Offer error: ${update.data}`);
      }
      if (update.status === 'accepted') {
        alert('Offer accepted');
      }
      if (update.status === 'refunded') {
        alert('Offer rejected');
      }
    },
  );
};

const makeConsultationOffer = (
  doctorId: string,
  patientId: string,
  fee: bigint,
) => {
  const { wallet, offerUpInstance, brands } = useAppStore.getState();
  if (!offerUpInstance) {
    alert('No contract instance found on the chain RPC: ' + ENDPOINTS.RPC);
    throw Error('no contract instance');
  }
  if (!brands || !brands.Token) {
    alert('Brands not available');
    throw Error('brands not available');
  }

  const give = { Fee: { brand: brands.Token, value: fee } };

  wallet?.makeOffer(
    {
      source: 'contract',
      instance: offerUpInstance,
      publicInvitationMaker: 'createConsultationInvitation',
    },
    { give, custom: { doctorId, patientId } },
    undefined,
    (update: { status: string; data?: unknown }) => {
      if (update.status === 'error') {
        alert(`Offer error: ${update.data}`);
      }
      if (update.status === 'accepted') {
        alert('Consultation offer accepted');
      }
      if (update.status === 'refunded') {
        alert('Consultation offer rejected');
      }
    },
  );
};

const makePurchaseOffer = (
  supplierId: string,
  patientId: string,
  medicineId: string,
  price: bigint,
) => {
  const { wallet, offerUpInstance, brands } = useAppStore.getState();
  if (!offerUpInstance) {
    alert('No contract instance found on the chain RPC: ' + ENDPOINTS.RPC);
    throw Error('no contract instance');
  }
  if (!brands || !brands.Token) {
    alert('Brands not available');
    throw Error('brands not available');
  }

  const give = { Price: { brand: brands.Token, value: price } };

  wallet?.makeOffer(
    {
      source: 'contract',
      instance: offerUpInstance,
      publicInvitationMaker: 'createPurchaseInvitation',
    },
    { give, custom: { supplierId, patientId, medicineId } },
    undefined,
    (update: { status: string; data?: unknown }) => {
      if (update.status === 'error') {
        alert(`Offer error: ${update.data}`);
      }
      if (update.status === 'accepted') {
        alert('Purchase offer accepted');
      }
      if (update.status === 'refunded') {
        alert('Purchase offer rejected');
      }
    },
  );
};

function App() {
  useEffect(() => {
    setup();
  }, []);

  const { wallet, purses } = useAppStore(({ wallet, purses }) => ({
    wallet,
    purses,
  }));
  const istPurse = purses?.find(p => p.brandPetname === 'IST');
  const itemsPurse = purses?.find(p => p.brandPetname === 'Item');
  const tokenPurse = purses?.find(p => p.brandPetname === 'Token');

  const tryConnectWallet = () => {
    connectWallet().catch(err => {
      switch (err.message) {
        case 'KEPLR_CONNECTION_ERROR_NO_SMART_WALLET':
          alert('no smart wallet at that address');
          break;
        default:
          alert(err.message);
      }
    });
  };

  return (
    <>
      <Logos />
      <h1>Medical Platform</h1>

      <div className="card">
        <Trade
          makeOffer={makeOffer}
          istPurse={istPurse as Purse}
          walletConnected={!!wallet}
        />
        <Consultation
          makeConsultationOffer={makeConsultationOffer}
          tokenPurse={tokenPurse as Purse}
          walletConnected={!!wallet}
        />
        <Purchase
          makePurchaseOffer={makePurchaseOffer}
          tokenPurse={tokenPurse as Purse}
          walletConnected={!!wallet}
        />
        <hr />
        {wallet && tokenPurse ? (
          <Inventory address={wallet.address} tokenPurse={tokenPurse} itemsPurse={itemsPurse as Purse} />
        ) : (
          <button onClick={tryConnectWallet}>Connect Wallet</button>
        )}
      </div>
    </>
  );
}

export default App;
