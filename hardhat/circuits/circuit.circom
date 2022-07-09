pragma circom 2.0.3;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

template Poap() {
    // private inputs
    signal input preImage;
    // public inputs
    signal input hash;
    signal input address;
    // outputs
    signal output nullifier;

    component hasher = Poseidon(1);
    hasher.inputs[0] <== preImage;
    hash === hasher.out;

    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== preImage;
    nullifierHasher.inputs[1] <== address;

    nullifier <== nullifierHasher.out;
}

component main{ public[hash, address] } = Poap();