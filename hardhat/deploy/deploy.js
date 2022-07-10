module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy('Verifier', {
        from: deployer,
        log: true
    });
};
module.exports.tags = ['complete'];

//0xb6BE61Dcd55E25fd6E3dB6aCB108eAb9490ffc37 - verifier
//0x5b1d5A6AB7E25931b1cb90932215F3FC65d0d7D6 - minter
