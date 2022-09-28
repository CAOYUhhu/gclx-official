import { useState, useEffect } from "react";
import styled from "styled-components";
import { ethers } from "ethers";
import Typography from "@mui/material/Typography";
import { throttle } from "lodash";
import Tooltip from "@mui/material/Tooltip";
import { Button,Input,Radio} from 'antd';
import { Col, Row } from 'antd';
import React from 'react';
import { formatUnits } from '@ethersproject/units';
import "@vetixy/circular-std";
import 'antd/dist/antd.css'


import { get, subscribe } from "../store";
import Container from "./Container";
import ConnectWallet, { connectWallet } from "./ConnectWallet";
import showMessage from "./showMessage";
import { padWidth } from "../utils";



const Head = styled.div`
  display: flex;
  
  align-items: center;
  color: white;
  @media only screen and (max-width: ${padWidth}) {
    flex-direction: column;
  }
`;

const MenuWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  
  @media only screen and (max-width: ${padWidth}) {
    margin-bottom: 20px;
    flex-wrap: wrap;
    justify-content: center;
  }
`;

const MenuItemText = styled.span`
  cursor: pointer;
  :hover {
    font-weight: bold;
  }
`;

function MenuItem(props) {
  const elementId = props.elementId;
  return (
    <MenuItemText
      style={{ padding: "10px 20px" }}
      onClick={() => {
        if (elementId) {
          const ele = document.getElementById(elementId);
          ele.scrollIntoView({ behavior: "smooth" });
        }
        props.onClick && props.onClick();
      }}
    >
      {props.children}
    </MenuItemText>
  );
}

const ETHERSCAN_DOMAIN =
  process.env.NEXT_PUBLIC_CHAIN_ID === "1"
    ? "etherscan.io"
    : "rinkeby.etherscan.io";

const Content = styled.div`
  max-width: 840px;
  margin: 0 auto 5% auto;
  strong {
    color: red;
  }
`;

const StyledMintButton = styled.div`
  display: inline-block;
  width: 140px;
  text-align: center;
  padding: 10px 10px;
  border: 2px solid #000;
  border-radius: 40px;
  color: black;
  background: #000;
  cursor: ${(props) => {
    return props.minting || props.disabled ? "not-allowed" : "pointer";
  }};
  opacity: ${(props) => {
    return props.minting || props.disabled ? 0.6 : 1;
  }};
`;

function MintButton(props) {
  const [minting, setMinting] = useState(false);

  return (
    <StyledMintButton
      disabled={!!props.disabled}
      minting={minting}
      onClick={async () => {
        if (minting || props.disabled) {
          return;
        }
        setMinting(true);
        try {
          const { signer, contract } = await connectWallet();
          const contractWithSigner = contract.connect(signer);
          const value = ethers.utils.parseEther(
            props.mintAmount === 1 ? "0.01" : "0.02"
          );
          const tx = await contractWithSigner.mint(props.mintAmount, {
            value,
          });
          const response = await tx.wait();
          showMessage({
            type: "success",
            title: "Mint Succeded",
            body: (
              <div>
                <a
                  href={`https://${ETHERSCAN_DOMAIN}/tx/${response.transactionHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View Transaction Details
                </a>{" "}
                Or View On Opensea{" "}
                <a
                  href="https://opensea.io/account"
                  target="_blank"
                  rel="noreferrer"
                >
                  
                </a>
                
              </div>
            ),
          });
        } catch (err) {
          showMessage({
            type: "error",
            title: "铸造失败",
            body: err.message,
          });
        }
        props.onMinted && props.onMinted();
        setMinting(false);
      }}
      style={{
        background: 'White',
        fontWeight: "bold" ,
        fontSize:'18px',
        marginTop:'10px',
        marginLeft:'7px',
        ...props.style,

      }}
    >
      Mint Now {minting ? "..." : ""}
    </StyledMintButton>
  );
}

function MintSection() {
  const [status, setStatus] = useState("0");
  const [progress, setProgress] = useState(null);
  const [fullAddress, setFullAddress] = useState(null);
  const [numberMinted, setNumberMinted] = useState(0);
  const [mintAmount, setmintAmount]=useState(1);
  
  const handleDecrement=()=>{
    if (mintAmount<=1) return;
    setmintAmount(mintAmount-1);
  }

  const handleIncrement=()=>{
    if (mintAmount>=5) return;
    setmintAmount(mintAmount+1);
  }

  async function updateStatus() {
    const { contract } = await connectWallet();
 
    
    const status = await contract.status();
    const progress = parseInt(await contract.totalSupply());

    setStatus(status.toString());
    setProgress(progress);
    // 在 mint 事件的时候更新数据
    const onMint = throttle(async () => {
      const status = await contract.status();
      const progress = parseInt(await contract.totalSupply());
      
      setStatus(status.toString());
      setProgress(progress);
    }, 1000 - 233);
    contract.on("Minted", onMint);
  }

  useEffect(() => {
    (async () => {
      const fullAddressInStore = get("fullAddress") || null;
      if (fullAddressInStore) {
        const { contract } = await connectWallet();

        const numberMinted = await contract.numberMinted(fullAddressInStore);
        setNumberMinted(parseInt(numberMinted));
        setFullAddress(fullAddressInStore);
      }
      subscribe("fullAddress", async () => {
        const fullAddressInStore = get("fullAddress") || null;
        
        setFullAddress(fullAddressInStore);
        if (fullAddressInStore) {
          
          const { contract } = await connectWallet();
          const numberMinted = await contract.numberMinted(fullAddressInStore);
          setNumberMinted(parseInt(numberMinted));
          updateStatus();
        }
      });
    })();
  }, []);

  useEffect(() => {
    try {
      const fullAddressInStore = get("fullAddress") || null;
      if (fullAddressInStore) {
        updateStatus();
      }
    } catch (err) {
      showMessage({
        type: "error",
        title: "获取合约状态失败",
        body: err.message,
      });
    }
  }, []);

  async function refreshStatus() {
    const { contract } = await connectWallet();
    const numberMinted = await contract.numberMinted(fullAddress);
    setNumberMinted(parseInt(numberMinted));
  }

  let mintButton = (
    <StyledMintButton
      style={{
        background: "#eee",
        color: "#999",
        cursor: "not-allowed",
        width:'200px',
        fontSize: "20px"
      }}
    >
      Not Started
    </StyledMintButton>
  );

  if (status === "1") {
    mintButton = (
      
      <div>
        <div>
          <Button type="primary" shape="circle" onClick={handleDecrement} style={{height: "40px",width:'40px',fontSize:'20px'}}>
            -
          </Button>
          <Input  value={mintAmount} style={{fontSize:'20px',width:'50px',height: "40px",textAlign:'center',marginLeft:'10px',marginRight:'10px'}}/>
          <Button type="primary" shape="circle" onClick={handleIncrement} style={{height: "40px",width:'40px',fontSize:'20px'}}>
            +
          </Button>
          
        </div>
        <div>
          <MintButton
            onMinted={refreshStatus}
            mintAmount={1}
            style={{ marginRight: "20px" }}
          />
        </div>
      </div>
    );
  }

  if (progress >= 1000 || status === "2") {
    mintButton = (
      <StyledMintButton
        style={{
          background: "#eee",
          color: "#999",
          cursor: "not-allowed",
          width:'200px',
          fontSize: "20px"
        }}
      >
        Minted Out
      </StyledMintButton>
    );
  }

  if (numberMinted === 2) {
    mintButton = (
      <StyledMintButton
        style={{
          background: "#eee",
          color: "#999",
          cursor: "not-allowed",
          width:'300px',
          fontSize: "20px"
        }}
      >
        You Have Minted Already
      </StyledMintButton>
    );
  }

  if (!fullAddress) {
    mintButton = (
      <StyledMintButton
        style={{
          background: "#eee",
          color: "#999",
          cursor: "not-allowed",
          width:'200px',
          fontSize: "20px"
        }}
      >
        Not Connected
      </StyledMintButton>
    );
  }

  

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color:'white'
      }}
    >
      

      <div style={{ marginBottom: 5, display: "flex", alignItems: "center",marginTop: "7%", }}>
        Your Wallet Address： <ConnectWallet />{" "}
      </div>
      <div style={{ marginTop: 0, fontSize: 20, textAlign: "center",marginBottom: 10,}}>
        Total Minted：{progress === null ? "Not Connected" : progress} / 10000
      </div>

      {mintButton}


    </div>



  );
}


function Jackpot() {
  
  const [balance, setBalancee] = useState(0);
  let newbalance
  let oldbalance
  setInterval(()=>{
    try{
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      provider.getBalance('0xF4ec364012Ef8db931b470Ec931F0d3f02D0a994').then((value)=>{
        oldbalance=newbalance
        newbalance=Number(formatUnits(value.toString(), 18)).toPrecision(2)
      })
    }catch{}
    if (newbalance!==oldbalance){
      setBalancee(newbalance)
    }
  }
  ,5000)
  
  
  


  return (

      <Typography
        style={{ textAlign: "center", marginTop: "0%",color:'white',fontSize: '70px',fontWeight: "bold" }}
        variant="h3"
        gutterBottom
        component="div"
      >
        {balance} ETH
      </Typography>
      

  );
}

function Mint() {
  

  return (
    
   
    

    <Container
      style={{
        width: "100%",
        height: "100%",
        fontFamily:'CircularStd',
        wordSpacing:'-5px'
      }}
      
      id="mint"
    >
      
      
      
        <Row justify="center"  style={{color:'White',alignItems: 'center' }}>
          <Col span={0.5}>
            <img src='/icons/logo.png' style={{width:'60px',marginTop:'8px'}}></img>
          </Col>
          <Col span={4} offset={0}>
          <a
              href="https://www.worldcupchampion.xyz/"
              style={{color:"white"}}>
            <MenuWrapper style = {{ fontSize:'27px',}} >
            <MenuItem elementId="About">WorldcupChampion</MenuItem>
            
            </MenuWrapper> 
            </a>
          </Col>  
          <Col span={11} >
            
          </Col> 
          <Col span={3.5} >
            <MenuWrapper style = {{ fontSize:'22px',}} >
            
              <a
              href="https://www.worldcupchampion.xyz/"
              style={{color:"white"}}>
              <MenuItem elementId="About">
                Back to Homepage
              </MenuItem>
              </a>
            
            </MenuWrapper>
          </Col> 
          <Col span={1} >
          <a
              href="https://www.worldcupchampion.xyz/"
              style={{color:"white"}}>
          <img src='/icons/back2.svg' style={{width:'40px',marginTop:'2px'}}></img>
          </a>


          </Col> 
          
          <Col span={1} >
          <ConnectWallet showCollect={true} />
          </Col> 
          <Col span={1} >
          
          </Col> 



        </Row>
        
   

      <Typography
        style={{ textAlign: "center", marginTop: "8%",color:'white',fontSize: '60px',fontWeight: "bold" }}
        variant="h3"
        gutterBottom
        component="div"
      >
        WorldcupChampion
      </Typography>

      <Content>
        <Typography
          style={{
            marginTop: '1%',
            marginLeft: '3%',
            fontSize: '19px',
            
            textAlign: "center",
            color:'white',
            width:'780px'
          }}
          variant="body1"
          gutterBottom
        >
          Worldcup Champion is a collection of 7360 jersey NFTs unlocking access to 
            
        </Typography>
        <Typography
          style={{
            marginTop: '1%',
            marginLeft: '3%',
            fontSize: '19px',
            
            textAlign: "center",
            color:'white',
            width:'780px'
          }}
          variant="body1"
          gutterBottom
        >
          Worldcup2022 betting game. Holders can carve up bonus pool as the game goes on.
            
        </Typography>

        <Typography
        style={{ textAlign: "center", marginTop: "8%",color:'white',fontSize: '40px', }}
        variant="h3"
        gutterBottom
        component="div"
      >
        Prize Pool: 
      </Typography>


        <div>
          <Jackpot />
        </div>


        <div>
          <MintSection />
        </div>
        
      </Content>

    </Container>
  );
}

export default Mint;
