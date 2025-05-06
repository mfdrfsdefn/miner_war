use bolt_lang::prelude::*;

declare_id!("2jMV4AYNBLzygv4SzZyyAVxHqNBDFSvhSd3GYWSrnptY");

#[program]
pub mod miner_war {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
