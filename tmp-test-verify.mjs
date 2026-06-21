import bitcoinMessage from 'bitcoinjs-message';
import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha2';
import { ripemd160 } from '@noble/hashes/legacy';
import { hmac } from '@noble/hashes/hmac';
import bs58check from 'bs58check';
import { randomBytes } from 'crypto';

secp.hashes.hmacSha256 = (k,m)=>hmac(sha256,k,m);
secp.hashes.sha256 = (m)=>sha256(m);

function dsha256(b){return sha256(sha256(b));}
function hash160(b){return ripemd160(sha256(b));}

function varint(n){
  if(n<0xfd)return new Uint8Array([n]);
  if(n<=0xffff){const a=new Uint8Array(3);a[0]=0xfd;a[1]=n&0xff;a[2]=(n>>8)&0xff;return a;}
  if(n<=0xffffffff){const a=new Uint8Array(5);a[0]=0xfe;new DataView(a.buffer).setUint32(1,n,true);return a;}
  throw new Error('too big');
}

function magicHash(msg, prefix){
  const pb = new TextEncoder().encode(prefix);
  const mb = new TextEncoder().encode(msg);
  const buf = new Uint8Array(varint(pb.length).length + pb.length + varint(mb.length).length + mb.length);
  let o=0;
  const pv=varint(pb.length); buf.set(pv,o);o+=pv.length;
  buf.set(pb,o);o+=pb.length;
  const mv=varint(mb.length); buf.set(mv,o);o+=mv.length;
  buf.set(mb,o);
  return dsha256(buf);
}

function verifyBitcoinMessage(msg, address, sigB64, prefix){
  const sig = Buffer.from(sigB64,'base64');
  if(sig.length!==65) return false;
  const header=sig[0];
  if(header<27||header>42) return false;
  const recId=(header-27)&3;
  const compressed=((header-27)&4)!==0 || header>=31;
  const compact=sig.subarray(1);
  const recBuf=new Uint8Array(65);recBuf[0]=recId;recBuf.set(compact,1);const recovered=secp.Signature.fromBytes(recBuf,'recovered');
  const hash=magicHash(msg,prefix);
  const pub=secp.recoverPublicKey(recBuf,hash,{prehash:false});
  const pubBytes=pub.toBytes(compressed?'compressed':'uncompressed');
  const h160=hash160(pubBytes);
  // decode address
  try{
    const decoded=bs58check.decode(address); // version byte + 20-byte hash
    const addrHash=decoded.slice(1);
    if(addrHash.length!==20) return false;
    for(let i=0;i<20;i++) if(addrHash[i]!==h160[i]) return false;
    return true;
  }catch{return false;}
}

// Generate a real sig with bitcoinjs-message, P2PKH compressed.
import * as bitcoin from 'bitcoinjs-lib';
import {ECPairFactory} from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';
const ECPair=ECPairFactory(tinysecp);
const network={messagePrefix:'\x18TEXITcoin Signed Message:\n',bech32:'tc',bip32:{public:0x0488b21e,private:0x0488ade4},pubKeyHash:0x41,scriptHash:0x05,wif:0x80};
const kp=ECPair.makeRandom({network,rng:()=>randomBytes(32)});
const pub=Buffer.from(kp.publicKey);
const {address}=bitcoin.payments.p2pkh({pubkey:pub,network});
const msg='hello-nonce-1234';
const sigBuf=bitcoinMessage.sign(msg,Buffer.from(kp.privateKey),true,network.messagePrefix);
const sigB64=sigBuf.toString('base64');
console.log('addr:',address);
console.log('sig:',sigB64);
console.log('bitcoinjs verify:',bitcoinMessage.verify(msg,address,sigB64,network.messagePrefix,true));
console.log('noble verify:',verifyBitcoinMessage(msg,address,sigB64,network.messagePrefix));
