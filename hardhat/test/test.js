const { expect, assert } = require("chai")
const { ethers } = require("hardhat")
const { BigNumber } = require("ethers")
const { buildPoseidon, poseidonContract } = require("circomlibjs")
const { exportCallDataGroth16 } = require("./utils/utils");

describe("ZKPOAP", function() {
    let Poap
    let poap
    let Verifier
    let verifier
    let Poseidon
    let poseidon
    let Poseidon2
    let poseidon2
    let preImage = 1234
    let name = "BCAT"
    let symbol = "BC"
    let signer
    let addrs

    beforeEach(async function() {
        // deploy verifier Contract
        Verifier = await ethers.getContractFactory("Verifier")
        verifier = await Verifier.deploy()
        await verifier.deployed()

        // deploy poseidon hashing contract [single input]
        Poseidon = await ethers.getContractFactory(
            poseidonContract.generateABI(1),
            poseidonContract.createCode(1)
        )
        poseidon = await Poseidon.deploy();
        await poseidon.deployed();

        // deploy poseidon2 hashing contract [double input]
        Poseidon2 = await ethers.getContractFactory(
            poseidonContract.generateABI(2),
            poseidonContract.createCode(2)
        )
        poseidon2 = await Poseidon2.deploy();
        await poseidon2.deployed();

        // deploy NFTMint Contract
        Poap = await ethers.getContractFactory("NFTMint");

        const hashedPreimage = await poseidon["poseidon(uint256[1])"]([preImage])

        poap = await Poap.deploy(verifier.address, hashedPreimage, name, symbol);
        await poap.deployed();

        [signer, ...addrs] = await ethers.getSigners()
    })

    describe("Proof Verification", async function() {

        it("should verify proof", async function() {

            const hashedImage = await poseidon["poseidon(uint256[1])"]([preImage])

            const input = {
                preImage: preImage,
                hash: hashedImage.toString(),
                address: signer.address,
            }

            // generate proof data
            let dataResult = await exportCallDataGroth16(
                input,
                "circuits/build/circuit_js/circuit.wasm",
                "circuits/build/circuit_final.zkey"
            );
            
            // Call the verify proof function
            let result = await verifier.verifyProof(
            dataResult.a,
            dataResult.b,
            dataResult.c,
            dataResult.Input
            );
            expect(result).to.equal(true);
        })
        
    })

    describe("NFTMinting", async function() {

        it("Should mint nft", async function() {
            // generate nullifier by hashing preimage with signer address
            const nullifier = await poseidon2["poseidon(uint256[2])"]([preImage, signer.address])

            // get the hash of the preImage
            const hashedImage = await poseidon["poseidon(uint256[1])"]([preImage])

            // inputs for verifier contract
            const input = {
                preImage: preImage,
                hash: hashedImage.toString(),
                address: signer.address,
            }

            // generate proof data
            let dataResult = await exportCallDataGroth16(
                input,
                "circuits/build/circuit_js/circuit.wasm",
                "circuits/build/circuit_final.zkey"
            );
            
            await poap.mintWithProof(nullifier, dataResult.a, dataResult.b, dataResult.c)
            
        })

        it("Should not mint nft for wrong preImage", async function() {
            const wrongImage = 4567
            // generate nullifier by hashing preimage with signer address
            const nullifier = await poseidon2["poseidon(uint256[2])"]([wrongImage, signer.address])

            // get the hash of the preImage
            const hashedImage = await poseidon["poseidon(uint256[1])"]([wrongImage])

            // inputs for verifier contract
            const input = {
                preImage: wrongImage,
                hash: hashedImage.toString(),
                address: signer.address,
            }

            // generate proof data
            let dataResult = await exportCallDataGroth16(
                input,
                "circuits/build/circuit_js/circuit.wasm",
                "circuits/build/circuit_final.zkey"
            );
            
            await expect(poap.mintWithProof(nullifier, dataResult.a, dataResult.b, dataResult.c)).to.be.revertedWith("NFTMint: Invalid proof")
            
        })

        it("Should not mint nft twice", async function() {
            // generate nullifier by hashing preimage with signer address
            const nullifier = await poseidon2["poseidon(uint256[2])"]([preImage, signer.address])

            // get the hash of the preImage
            const hashedImage = await poseidon["poseidon(uint256[1])"]([preImage])

            // inputs for verifier contract
            const input = {
                preImage: preImage,
                hash: hashedImage.toString(),
                address: signer.address,
            }

            // generate proof data
            let dataResult = await exportCallDataGroth16(
                input,
                "circuits/build/circuit_js/circuit.wasm",
                "circuits/build/circuit_final.zkey"
            );

            // mint nft
            await poap.mintWithProof(nullifier, dataResult.a, dataResult.b, dataResult.c)
            
            // try to mint again
            await expect(poap.mintWithProof(nullifier, dataResult.a, dataResult.b, dataResult.c)).to.be.revertedWith("NFTMint: Nullifier is used")
            
        })

    })

})