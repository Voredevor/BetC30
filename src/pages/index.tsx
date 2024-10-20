"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { NextPage } from "next";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { useAccount, useBalance, useSwitchChain } from "wagmi";
import ABI from "../ABI.json";
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
  getContract,
  http,
  parseUnits,
  toHex,
} from "viem";
import { bsc } from "viem/chains";
import { useSearchParams } from "next/navigation";
import { getDefaultConfig, connectorsForWallets, wallet } from '@rainbow-me/rainbowkit';
import { configureChains, createClient, WagmiConfig } from 'wagmi';
import { mainnet, polygon, bsc } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { walletConnectWallet, metaMaskWallet, coinbaseWallet } from '@rainbow-me/rainbowkit/wallets';


// Infura endpoint URL for BSC (or ETH if that's the network)
const infuraUrl = `https://bsc-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`;

const phases = [
  { "0": "Phase 1" },
  { "1": "Phase 2" },
  { "2": "Phase 3" },
  { "3": "Phase 4" },
  { "4": "Phase 5" },
  { "5": "Phase 6" },
  { "6": "Phase 7" },
  { "7": "Phase 8" },
];
const phasesSupply=[600000000,400000000,300000000,250000000,200000000,100000000,100000000,100000000];

const tabs = ["Presale", "Staking", "Referral"];

// Contract details
const contractAddress = "0x0815091B7f4511b5B35bd727AcbCF3c6C2449EFc";

const Home: NextPage = () => {
  const params = useSearchParams();
  const referrer = params.get("referrer");

  // states
  const { switchChain } = useSwitchChain();
  const [calculatedTokens, setCalculatedTokens] = useState(0);
  const [activePhase, setActivePhase] = useState("");
  const [BNBAmount, setBNBAmount] = useState(0);
  const [tokenPrice, setTokenPrice] = useState(0);
  const [currentTab, setCurrentTab] = useState("Presale");
  const [activePhaseSupply, setActivePhaseSupply] = useState("");

  // stake tab
  const [userStake, setUserStake] = useState(Array<any>);
  const [stakeStart, setStakeStart] = useState(Date);
  const [stakeEnd, setStakeEnd] = useState(Date);
  const [stakingTokens, setStakingTokens] = useState("0");
  const [stakingPeriod, setStakingPeriod] = useState(6);
  const [isHarvest, setIsHarvest] = useState(0);
  const stakeInputRef = useRef<HTMLInputElement | null>(null);
  const [userBalance, setUserBalance] = useState(0);
  // referral tab
  const [reward, setReward] = useState(0);

  // hooks
  const { address, chain } = useAccount();
  const bal = useBalance({ address });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const publicClient = createPublicClient({
    chain: bsc,
    transport: http(infuraUrl),
  });

  useEffect(() => {
    const contract = getContract({
      address: contractAddress,
      abi: ABI,
      client: { public: publicClient},
    });
    const handleReadd = async () => {

      const res = (await contract.read.currentPresalePhase()) as string;

      setActivePhase(res.toString().slice(0, 1));

      const price = (await publicClient.readContract({
        address: contractAddress,
        abi: ABI,
        functionName: "presalePhases",
        args: [res],
      })) as any;
      
      console.log(formatUnits(price[1], 18));
      setTokenPrice(Number(formatUnits(price[1], 18)));
      setActivePhaseSupply(formatUnits(price[0], 18).toString());
    };
    handleReadd();
    if (typeof window !== "undefined" && address) {
      const walletClient = createWalletClient({
        chain: bsc,
        transport: custom(window?.ethereum!),
        account: address,
      });
 
      
      const handleSwitchNetwork = async () => {
        if(chain?.id){
          if (chain?.id !== bsc.id) {
            try {
              // Try using wagmi's switchNetwork method
              if (switchChain) {
                switchChain({ chainId: bsc.id }); // Pass your desired chain ID
              } else {
                // If `switchNetwork` is unavailable, request network change manually
                await window.ethereum.request({
                  method: "wallet_switchEthereumChain",
                  params: [{ chainId: toHex(bsc.id) }],
                });
              }
            } catch (error) {
              console.error("Failed to switch network:", error);
              // You can prompt the user to add the network if it's not available
              if (error) {
                try {
                  await walletClient.addChain({ chain: bsc });
                } catch (addError) {
                  console.error("Failed to add network:", addError);
                }
              }
            }
          }
        }
      };
      const contract = getContract({
        address: contractAddress,
        abi: ABI,
        client: { public: publicClient, wallet: walletClient },
      });
      const handleRead = async () => {
        await handleSwitchNetwork();

        const res = (await contract.read.currentPresalePhase()) as string;

        setActivePhase(res.toString().slice(0, 1));

        const price = (await publicClient.readContract({
          address: contractAddress,
          abi: ABI,
          functionName: "presalePhases",
          args: [res],
        })) as any;
        const userB = await contract.read.balanceOf([address]) as bigint;
        setUserBalance(Number(formatUnits(userB, 18)));
        const stakeInfo : Array<any> = await contract.read.stakers([address]) as Array<any>;
        setUserStake(stakeInfo);
        if (Number(formatUnits(stakeInfo[0], 18))>0){
          
          const stakeInfoPeriod = Number(stakeInfo[1]);
          const stakeInfoStartEpoch = Number(stakeInfo[2]);
          // Staking start epoch time
          const stakingStart = stakeInfoStartEpoch * 1000; // Convert to milliseconds for Date object

          // Create a Date object from the stakingStart
          const startDate = new Date(stakingStart);
          setStakeStart(startDate.toDateString());
          // Add x months to the date using setMonth (which handles different month lengths)
          const endDate = new Date(startDate);
          endDate.setMonth(startDate.getMonth() + stakeInfoPeriod);
          setStakeEnd(endDate.toDateString());
          // Convert the endDate back to epoch time (in seconds)
          const epochAfterXMonths = Math.floor(endDate.getTime() / 1000);
          const currentEpoch = Math.floor(Date.now() / 1000)
          if (currentEpoch>= epochAfterXMonths){
            setIsHarvest(1);
          }
        }

        console.log(formatUnits(price[1], 18));
        setTokenPrice(Number(formatUnits(price[1], 18)));
        setActivePhaseSupply(formatUnits(price[0], 18).toString());
      };
      handleRead();
    }
  }, [address]);

  useEffect(() => {
    console.log(tokenPrice);
    console.log(BNBAmount);
    setCalculatedTokens(BNBAmount / tokenPrice);
  }, [BNBAmount, tokenPrice]);

  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleBuyToken = async () => {
    const walletClient = createWalletClient({
      chain: bsc,
      transport: custom(window?.ethereum!),
      account: address,
    });
    const inputBnb = parseUnits(BNBAmount.toString(), 18);
    try {
      let writeObject = {
        address: contractAddress as `0x${string}`,
        abi: ABI,
        functionName: "participateInPresale",
        account: address as `0x${string}`,
        value: inputBnb,
        args:[address],
      } as {
        address: `0x${string}`;
        abi: any;
        functionName: string;
        account: `0x${string}`;
        value: bigint;
        args: string[];
      };

      // if referrer then add it
      if (referrer) {
        console.log(referrer);
        writeObject.args = [referrer];
      }

      const res = await walletClient.writeContract(writeObject);
      console.log(res);
    } catch (error) {
      console.log("Buy tokens error:", error);
    }
  };

  const handleStake = async () => {
    if (stakingTokens !== "0") {
      const walletClient = createWalletClient({
        chain: bsc,
        transport: custom(window?.ethereum!),
        account: address,
      });

      try {
        const res = await walletClient.writeContract({
          address: contractAddress,
          abi: ABI,
          functionName: "stakeTokens",
          account: address as `0x${string}`,
          args: [stakingTokens, stakingPeriod],
        });
        console.log(res);
      } catch (error) {
        console.log("Buy tokens error:", error);
      }
    }
  };

  const handleHarvest = async () => {
    if(isHarvest !== 0){
      const walletClient = createWalletClient({
        chain: bsc,
        transport: custom(window?.ethereum!),
        account: address,
      });

      try {
        const res = await walletClient.writeContract({
          address: contractAddress,
          abi: ABI,
          functionName: "claimStakedRewards",
          account: address as `0x${string}`,
        });
        console.log(res);
      } catch (error) {
        console.log("Unstake tokens error:", error);
      }
    }
  };

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////
  // NEW CODE //
  const { chains, provider } = configureChains(
    [mainnet, polygon, bsc], 
    [publicProvider()]
  );

  const connectors = connectorsForWallets([
  {
    groupName: 'Recommended',
    wallets: [
      metaMaskWallet({ chains }),
      walletConnectWallet({ chains }),
      coinbaseWallet({ chains, appName: 'My Dapp' }),
    ],
  },
]);


const wagmiClient = createClient({
  autoConnect: true, 
  connectors,
  provider,
});




  return (
    <div className="h-full min-h-screen w-full">
      <Head>
        <title>Betscoin AI Presale</title>
        <meta content="" name="description" />
        <link href="./Icon.svg" rel="icon" />
      </Head>

      <main className="bg-black text-white min-h-screen flex flex-col justify-start items-center">
        <div className="flex flex-col items-center max-w-[90vw] lg:max-w-[30vw] gap-y-8 mt-2 md:mt-12">
          <div className="relative md:absolute md:right-5">

          <WagmiConfig client={wagmiClient}>
          <RainbowKitProvider chains={chains}>
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
              }) => {
                // Note: If your app doesn't use authentication, you
                // can remove all 'authenticationStatus' checks
                const ready = mounted && authenticationStatus !== "loading";
                const connected =
                  ready &&
                  account &&
                  chain &&
                  (!authenticationStatus ||
                    authenticationStatus === "authenticated");

                return (
                  <div
                    {...(!ready && {
                      "aria-hidden": true,
                      style: {
                        opacity: 0,
                        pointerEvents: "none",
                        userSelect: "none",
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            type="button"
                            className="bg-[#fed41d] rounded-md py-4 px-4 text-black font-bold"
                          >
                            Connect Wallet
                          </button>
                        );
                      }

                      if (chain.unsupported) {
                        return (
                          <button onClick={openChainModal} type="button">
                            Wrong network
                          </button>
                        );
                      }

                      return (
                        <div className="flex justify-center gap-x-2 bg-[#fed41d] rounded-md text-black font-bold">
                          <button
                            onClick={() => {
                              openAccountModal();
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                            }}
                            className="w-full text-center flex justify-center"
                            type="button"
                          >
                            {chain.hasIcon && (
                              <div
                                style={{
                                  background: chain.iconBackground,
                                  width: 12,
                                  height: 12,
                                  borderRadius: 999,
                                  overflow: "hidden",
                                  marginRight: 4,
                                }}
                              >
                                {chain.iconUrl && (
                                  <img
                                    alt={chain.name ?? "Chain icon"}
                                    src={chain.iconUrl}
                                    style={{ width: 12, height: 12 }}
                                  />
                                )}
                              </div>
                            )}
                            {chain.name}
                          </button>

                          <button onClick={openAccountModal} type="button">
                            {account.displayName}
                            {account.displayBalance
                              ? ` (${account.displayBalance})`
                              : ""}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
            ///////////////////////////////////
            ///////////////////////////////////
            </RainbowKitProvider>
            </WagmiConfig>
          </div>

          <img
            src="./Logo-White.png"
            alt="bnb=icon"
            className=" md:h-auto"
          />
          
          <h1 className=" text-2xl md:text-4xl">PRESALE IS LIVE</h1>
          <div className="flex gap-x-3">
            {tabs.map((t) => (
              <div
                className={` p-3 px-8 rounded-lg ${
                  currentTab === t
                    ? "bg-white text-black shadow-xl shadow-white/20 "
                    : "bg-[#191919]"
                } transition-all duration-200 hover:scale-105 cursor-pointer`}
                onClick={() => {
                  setCurrentTab(t);
                }}
              >
                {t}
              </div>
            ))}
          </div>
          <h1 className=" text-3xl md:text-5xl"></h1>
        </div>
        <div className="flex flex-col items-center justify-center h-full mb-5 md:mb-64">
          {currentTab === "Presale" ? (
            <div className="bg-[#191919] border border-white/10 lg:w-[35vw] rounded-2xl h-fit mt-5 lg:mt-0">
              <div className="p-8 w-full h-fit">
                <div>
                  <div className="flex justify-between">
                    <h4 className="mb-3">Enter BNB Amount</h4>

                    <div className="flex items-center gap-x-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"
                        />
                      </svg>
                      <span>
                        {bal?.data?.value !== undefined &&
                          formatUnits(bal?.data?.value as any, 18)}
                      </span>
                      <span>BNB</span>
                    </div>
                  </div>
                  <div
                    className="bg-black flex justify-between items-center p-3 rounded-lg"
                    onClick={handleClick}
                  >
                    <div className="bg-[#191919] w-28 py-2 rounded-lg flex justify-center items-center">
                      <img className="w-6 h-6" src="./bnb.svg" alt="bnb=icon" />
                      <span className="ml-2">BNB</span>
                    </div>
                    <div>
                      <input
                        defaultValue={0}
                        type="number"
                        className="bg-black text-end focus:outline-none"
                        ref={inputRef}
                        onChange={(e) => {
                          setBNBAmount(Number(e.target.value));
                        }}
                        // value={BNBAmount}
                      />
                    </div>
                  </div>
                </div>
                <span className="pl-2">Current Token Price: {tokenPrice}</span>
                {/* divider */}

                <div className="w-full relative pb-4 pt-12 ">
                  <div className="w-full bg-white/20 h-[1px] rounded-full absolute"></div>
                  <div className="border rounded-full absolute w-6 h-6 border-white/20 top-[36px] left-[50%] -ml-[12px] bg-[#191919]"></div>
                </div>

                <div>
                  <h4 className="mb-3">Your Betscoin AI Tokens</h4>
                  <div className="bg-black flex justify-between items-center p-3 rounded-lg">
                    <div className="bg-[#191919] w-28 py-2 rounded-lg flex justify-center items-center">
                      <img
                        className="w-6 h-6"
                        src="./Icon.svg"
                        alt="bnb=icon"
                      />
                      <span className="ml-2">BETC</span>
                    </div>
                    <div>
                      {calculatedTokens !== 0
                        ? calculatedTokens
                        : "Enter BNB Amount First!"}
                    </div>
                  </div>
                </div>
                
                <div className="w-full [&>div>button]:w-full mt-10">
                  <div className="flex justify-center gap-x-3 bg-[#fed41d] rounded-md text-black font-bold">
                    <button
                      onClick={() => {
                        handleBuyToken();
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                      }}
                      className="w-full text-center flex justify-center py-4"
                      type="button"
                    >
                      Buy Tokens
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : currentTab === "Staking" ? (
            <div className="bg-[#191919] border border-white/10 lg:w-[35vw] rounded-2xl h-fit mt-5 lg:mt-0">
              <div className="p-8 w-full h-fit">
                <div>
                  <h4 className="mb-3">Your BETC Tokens</h4>
                  <div
                    onClick={() => {
                      if (stakeInputRef.current) {
                        stakeInputRef.current.focus();
                      }
                    }}
                    className="bg-black flex justify-between items-center p-3 rounded-lg"
                  >
                    <div className="bg-[#191919] w-28 py-2 rounded-lg flex justify-center items-center">
                      <img
                        className="w-6 h-6"
                        src="./Icon.svg"
                        alt="bnb=icon"
                      />
                      <span className="ml-2">BETC</span>
                    </div>
                    <div>
                      <input
                        defaultValue={Math.floor(userBalance)}
                        type="number"
                        className="bg-black text-end focus:outline-none"
                        ref={stakeInputRef}
                        onChange={(e) => {
                          setStakingTokens(parseUnits(e.target.value.toString(), 18).toString());
                        }}
                        
                      />
                    </div>
                  </div>
                </div>

                {/* divider */}

                <div className="w-full relative pb-4 pt-12 ">
                  <div className="w-full bg-white/20 h-[1px] rounded-full absolute"></div>
                  <div className="border rounded-full absolute w-6 h-6 border-white/20 top-[36px] left-[50%] -ml-[12px] bg-[#191919]"></div>
                </div>

                <div>
                  <div className="flex justify-between">
                    <h4 className="mb-3">Select period</h4>
                  </div>
                  <div className="bg-black flex justify-between items-center p-3 rounded-lg">
                    <div className="flex-1 ">
                      <select
                        defaultValue={0}
                        className="bg-black text-end focus:outline-none w-full h-10"
                        onChange={(e) => {
                          setStakingPeriod(Number(e.target.value));
                        }}
                      >
                        <option value="6">6 Months</option>
                        <option value="12">12 Months</option>
                        <option value="24">24 Months</option>
                        <option value="48">48 Months</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div style={{ paddingTop: '30px' }}>
                  <div className="flex justify-between">
                    <h4 className="mb-3">Your Staked Position Information</h4>
                  </div>
                  {userStake[0] ? (
                      <div>
                        <h2 className="mb-3">Amount staked: {formatUnits(userStake[0].toString(),18).toString()} BETC</h2>
                        <h2 className="mb-3">Staking period: {userStake[1].toString()} Months</h2>
                        <h2 className="mb-3">Staking start date: {stakeStart} </h2>
                        <h2 className="mb-3">Staking end date: {stakeEnd} </h2>
                      </div>
                    ) : (
                      <div>You have no staked position.</div>
                  )}
                  
                  
                </div>

                <div className="w-full [&>div>button]:w-full mt-10 flex gap-x-2">
                  <div
                    className={`flex justify-center gap-x-3 ${
                      isHarvest === 0 ? "bg-[#fed51d6b]" : "bg-[#fed41d]"
                    } rounded-md text-black font-bold w-full `}
                  >
                    <button
                      onClick={() => {
          

                        handleHarvest();
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                      }}
                      className="w-full text-center flex justify-center py-4 "
                      type="button"
                      disabled={isHarvest === 0}
                    >
                      Harvest
                    </button>
                  </div>
                  <div className="flex justify-center gap-x-3 bg-[#fed41d] rounded-md text-black font-bold w-full">
                    <button
                      onClick={() => {
                        if(stakeInputRef.current){
                          setStakingTokens(parseUnits(stakeInputRef.current?.value.toString(), 18).toString());
                          console.log()
                        }
                        handleStake();
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                      }}
                      className="w-full text-center flex justify-center py-4"
                      type="button"
                    >
                      Stake
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#191919] border border-white/10 lg:w-[35vw] rounded-2xl h-fit mt-5 lg:mt-0">
              <div className="p-8 w-full h-fit">
                <div>
                  <div className="flex justify-between">
                    <h4 className="mb-3">Your referral link</h4>
                  </div>
                  <div
                    className="bg-black flex justify-between items-center p-3 rounded-lg gap-x-5"
                    onClick={handleClick}
                  >
                    <div className=" py-2 rounded-lg flex justify-center items-center w-full overflow-x-auto">
                      <span className=" w-full text-xs text-nowrap ">
                        {window.location.href + `?referrer=${address}`}
                      </span>
                    </div>
                    <button
                      className="bg-[#fed41d] text-black font-semibold text-sm rounded-lg p-2"
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          window.location.href + `?referrer=${address}`
                        );
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
                        />
                      </svg>
                    </button>
                  </div>
                </div>


                
              </div>
            </div>
          )}
          {/* <div className="mt-6 flex gap-x-2 flex-wrap justify-center">

            <div className="w-full">
              <div className="flex justify-between mb-2">
                <span className="pr-2">Minted Tokens: {(phasesSupply[Number(activePhase)]-Number(activePhaseSupply)).toFixed(2)}</span>
                <span className="pl-2">Total Phase Supply: {phasesSupply[Number(activePhase)]}</span>
                <span className="pl-2">Current Token Price: {tokenPrice}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-green-500 h-4 rounded-full"
                  style={{ width: `${((phasesSupply[Number(activePhase)]-Number(activePhaseSupply))/phasesSupply[Number(activePhase)])*100}%` }}
                ></div>
              </div>
              <p className="text-center mt-2">{(((phasesSupply[Number(activePhase)]-Number(activePhaseSupply))/phasesSupply[Number(activePhase)])*100).toFixed(2)}% Minted</p>
            </div>

          </div> */}
          {/* <div className="mt-6 flex gap-x-2 flex-wrap justify-center">
            {phases.map((ph: any, i) => (
              <div className="flex items-center gap-x-2">
                <div
                  className={`${
                    Number(activePhase) >= Number(Object.keys(ph)[0])
                      ? "text-green-500"
                      : "text-white"
                  }`}
                >
                  {ph[Object.keys(ph)[0]]}
                </div>
                {i == phases.length - 1 ? (
                  <></>
                ) : (
                  <div
                    className={`${
                      Number(activePhase) > Number(Object.keys(ph)[0])
                        ? "text-green-500"
                        : "text-white"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      className="size-6"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3"
                      />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div> */}
        </div>
      </main>
    </div>
  );
};

export default Home;
