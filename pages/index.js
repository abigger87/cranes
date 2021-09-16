import Head from "next/head";
import { useEffect, useState, useRef } from "react";
import Web3, { utils } from "web3";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { InjectedConnector } from "@web3-react/injected-connector";
import { WalletConnectConnector } from "@web3-react/walletconnect-connector";
import { Web3ReactProvider, useWeb3React } from "@web3-react/core";
import cn from "classnames";
import debounce from "debounce";

const contractAddress =
  process.env.NODE_ENV === "production"
    ? process.env.DEPLOYED_MAINNET_CONTRACT_ADDRESS
    : process.env.DEPLOYED_RINKEBY_CONTRACT_ADDRESS;

const injected = new InjectedConnector({ supportedChainIds: [1, 3, 4, 5, 42] });
const wcConnector = new WalletConnectConnector({
  infuraId: "cddde80366fc42c2ac9202c6a0f9850b",
});

function getLibrary(provider) {
  return new Web3(provider);
}

const abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "walletAddress",
        type: "address",
      },
    ],
    name: "craftForFriend",
    outputs: [],
    type: "function",
  },
  {
    inputs: [],
    name: "craftForSelf",
    outputs: [],
    type: "function",
  },
  {
    inputs: [],
    name: "currentYearTotalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    type: "function",
  },
];

export default function WrappedHome() {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <Home />
    </Web3ReactProvider>
  );
}

function Home() {
  const { activate, active, account, library } = useWeb3React();

  const [working, setWorking] = useState(false);
  const [contract, setContract] = useState(null);
  const [error, setError] = useState(null);
  const [yearTotal, setYearTotal] = useState(0);
  const [friendAddress, setFriendAddress] = useState("");
  const [realFriendAddress, setRealFriendAddress] = useState("");
  const [transactionHash, setTransactionHash] = useState(null);
  const friendField = useRef();

  useEffect(() => {
    if (!library) return;

    const contract = new library.eth.Contract(abi, contractAddress);
    setContract(contract);

    contract.methods
      .currentYearTotalSupply()
      .call()
      .then((res) => {
        setYearTotal(res);
      }, handleError);

    setWorking(false);
  }, [account]);

  useEffect(() => {
    if (!friendAddress) return;

    if (friendAddress.match(/0x[a-fA-F0-9]{40}/)) {
      setRealFriendAddress(friendAddress);
      return;
    }

    if (friendAddress.match(/\./)) {
      debouncedLookup();
    }
  }, [friendAddress]);

  function handleError(err) {
    console.error(err);
    setWorking(false);
    setError(err);
  }

  function craftForSelf() {
    setWorking(true);

    contract.methods
      .craftForSelf()
      .send({ from: account, value: utils.toWei("0.02", "ether") })
      .then((res) => {
        setWorking(false);
        setTransactionHash(res.transactionHash);
      }, handleError);
  }

  function craftForFriend() {
    if (!realFriendAddress) {
      friendField.current.focus();
    }

    setWorking(true);

    contract.methods
      .craftForFriend(realFriendAddress)
      .send({ from: account, value: utils.toWei("0.02", "ether") })
      .then((res) => {
        setWorking(false);
        setTransactionHash(res.transactionHash);
      }, handleError);
  }

  const debouncedLookup = debounce(async () => {
    setWorking(true);
    try {
      const address = await library.eth.ens.getAddress(friendAddress);
      setRealFriendAddress(address);
    } catch {}

    setWorking(false);
  }, 1000);

  return (
    <main className="max-w-4xl mx-auto text-base md:text-2xl">
      <Head>
        <title>Rustaceans</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </Head>

      <div className="p-5 md:p-16">
        <header className="leading-normal">
            <h1 className="md:text-6xl font-bold md:font-thin py-8">Rustaceans</h1>
            <h2 className="font-light tracking-tight md:text-2xl max-w-5xl italic">
              <span className="rustacean bg-clip-text text-transparent font-bold">Rustaceans</span> are a <span className="rainbow bg-clip-text text-transparent font-bold"><a href="https://cranes.supply">Cranes</a></span>{" "} derivative project driving value back to Crane hodlers. A Crane's gotta eat too...
            </h2>
            <div className="h-2"></div>
            <p className="text-sm text-gray-700 dark:text-gray-400">
              <span className="rainbow bg-clip-text text-transparent font-bold">Cranes</span> ❤️️ <span className="rustacean bg-clip-text text-transparent font-bold">Rustaceans</span>
            </p>
            {/* <p className="text-sm pt-1 italic text-gray-700 dark:text-gray-400">
              Hey, a Crane has to eat too...
            </p> */}
        </header>
        <div className="h-8"></div>
        <div>
          {!active && (
            <ConnectButtons setWorking={setWorking} activate={activate} />
          )}
          {active && (
            <div className="flex flex-col space-y-4 md:max-w-md">
              <MintButton
                disabled={working}
                onClick={craftForSelf}
                className="rounded-full"
              >
                Mint Rustacean (Ξ0.02)
              </MintButton>

              <div className="flex flex-col">
                <input
                  ref={friendField}
                  className="input text-sm md:text-lg rounded-2xl rounded-b-none"
                  value={friendAddress}
                  onChange={(event) => {
                    setFriendAddress(event.target.value);
                  }}
                  placeholder={"0x… or ENS domain"}
                />
                <MintButton
                  disabled={working}
                  className="rounded-2xl rounded-t-none"
                  onClick={craftForFriend}
                >
                  Mint for a friend (Ξ0.02)
                </MintButton>
              </div>

              {realFriendAddress && (
                <div className="text-sm truncate">
                  Sending to{" "}
                  <code className="bg-gray-100" title={realFriendAddress}>
                    {realFriendAddress}
                  </code>
                </div>
              )}

              <div className="h-2"></div>

              {transactionHash && (
                <div className="text-green-500 text-xs flex flex-col space-y-2">
                  <span>Success!</span>
                  <a
                    href={`https://etherscan.io/tx/${transactionHash}`}
                    className="btn font-normal bg-gray-100 rounded-full shadow-md"
                  >
                    View transaction on Etherscan
                  </a>
                </div>
              )}
              {error && (
                <div className="text-red-500 text-xs">{error.message}</div>
              )}

              <div className="text-sm space-y-2 leading-normal">
                <p>
                  <strong>Rustaceans are Ξ0.02</strong>{" "}
                </p>
                <p>
                  You can mint one for yourself or for a friend. The result will
                  be different for each rustacean depending on its number and
                  destination address.
                </p>

                <p>
                  {yearTotal}/1,000 rustaceans have been minted in{" "}
                  {new Date().getFullYear()}.
                </p>

                <progress
                  className="w-full"
                  max={1000}
                  value={yearTotal}
                  disabled={working}
                />

                <p>
                  If all 1,000 rustaceans are minted in a year, holders of both Cranes and Rustaceans get to mint
                  a <em>Special Edition</em> [redacted] for free.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3">
        {/* <img src="/last-67.svg" className="" />
        <img src="/last-1.svg" className="" />
        <img src="/last-13.svg" className="" />
        <img src="/last-4.svg" className="" />
        <img src="/last-7.svg" className="" />
        <img src="/last-8.svg" className="" /> */}
      </div>

      <div className="p-5 md:p-16">
        <div className="space-y-4 md:space-y-8 font-light">
          <h2 className="md:text-5xl font-thin">FAQ</h2>
          <div>
            <H4>Who's behind Rustaceans?</H4>
            <p>
              <span className="rustacean bg-clip-text text-transparent font-bold">Rustaceans</span> are designed and coded by{" "}
              <a
                href="https://andreasbigger.com"
                className="text-blue-500 underline"
              >
                Andreas Bigger
              </a>.
              But inspiration is entirely derived from{" "}
              <a
                href="https://mikkelmalmberg.com"
                className="text-blue-500 underline"
              >
                Mikkel Malmberg
              </a>
              's <span className="rainbow bg-clip-text text-transparent font-bold"><a href="https://cranes.supply">*Cranes*</a></span>{" "} project.
            </p>
          </div>
          <div>
            <H4>Why paper "crabs" (rustaceans)?</H4>
            <p>
              From{" "}
              <A href="https://en.wikipedia.org/wiki/One_thousand_origami_cranes">
                Wikipedia
              </A>
              :
            </p>
            <blockquote className="pl-6 p-3 italic">
              One day, the crane thought that he had had enough of fish and he should eat something else to change his taste.
              He asked a crab to hop on his back. The crab was quite happy to grab that offer.
              When the crane was soaring high in the sky, the crab was amazed to see the vastness of the landscape.
              While he was enjoying the flight, his eyes fell on a huge heap of fish skeletons. He enquired about that heap from the crane.
              The crane told him the reality and said, “You should begin your last prayer because I am going to finish you off.”
            </blockquote>
          </div>
          <div>
            <H4>
              What do you mean by <em>fully on-chain</em>?
            </H4>
            <p>
              Everything, even the image data, is stored directly on the
              Ethereum blockchain. Most NFTs hold only the metadata and
              ownership information and then links to an external service for
              the actual asset. This is mostly fine, however the service storing
              that asset may disappear or the data go corrupt. Probably not, but
              maybe. Even if this website disappears at some point, Rustaceans will
              be around as long as the blockchain itself.
            </p>
          </div>
          <div>
            <H4>How are the Rustaceans generated?</H4>
            <p>
              The Rustaceans are generated from the same SVG template, seeded with
              random colors. It isn't true randomness, as we still expect the
              same Rustacean to have the same colors every time we view it. So the
              colors are <em>*randomly*</em> chosen from a few seed values, that
              make it always return the same colors for the same seed, which is
              mint year + token id + destination address.
            </p>
          </div>
          <div>
            <H4>How do I buy one?</H4>
            <p>
              First you need an Ethereum wallet. I recommend{" "}
              <A href="https://rainbow.me">🌈&nbsp;Rainbow</A>.{" "}
              <A href="https://metamask.io/">Metamask</A> is fine too. Then you
              buy some ETH. Then you use this website as long as supplies last.
            </p>
          </div>
          <div>
            <H4>How are Rustaceans licensed?</H4>
            <p>
              Following the Cranes standard, Rustaceans, the contract code, IP and resulting assets are all <strong className='font-bold'>Public
              Domain</strong>. Feel free to build upon the project in any way you'd like.
            </p>
          </div>
        </div>
      </div>
      <div className="text-sm p-5 md:p-16">
        <A href={`https://etherscan.io/address/${contractAddress}`}>
          Etherscan
        </A>{" "}
        &bull;{" "}
        <A href="https://opensea.io/collection/rustaceans-for-special-wallets">
          OpenSea
        </A>{" "}
        &bull; <A href="https://github.com/abigger87/rustaceans">GitHub</A> &bull;{" "}
        <A href="https://twitter.com/andreasbigger">Twitter</A> &bull; There's no
        Discord
      </div>
    </main>
  );
}

const A = (props) => <a className="text-blue-500 underline" {...props} />;
const H4 = (props) => <h4 className="font-bold" {...props} />;
const Answer = (props) => <div className="font-light" {...props} />;

function ConnectButtons({ activate, setWorking }) {
  const cls =
    "btn bg-white dark:bg-gray-900 rounded-full inline-flex images-center space-x-2 shadow-md border w-100 md:w-auto text-base font-normal";
  return (
    <>
      <h3>Connect wallet</h3>
      <div className="h-2"></div>
      <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 md:space-x-2">
        <button
          onClick={() => {
            setWorking(true);
            activate(injected);
          }}
          className={cn(cls, "text-yellow-600 border-yellow-600")}
        >
          <img src="/metamask-fox.svg" className="h-5 w-5" />
          <span>Metamask</span>
        </button>
        <button
          onClick={() => {
            setWorking(true);
            activate(wcConnector);
          }}
          className={cn(cls, "text-blue-500 border-blue-600")}
        >
          <img src="/walletconnect-logo.svg" className="h-5 w-5" />
          <span>WalletConnect</span>
        </button>
      </div>
    </>
  );
}

function MintButton({ className, ...props }) {
  return (
    <button
      className={cn(
        "btn md:text-lg text-sm tracking-tight bg-black dark:bg-white dark:text-black shadow-md font-light text-white",
        className
      )}
      {...props}
    />
  );
}
