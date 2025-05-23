use bolt_lang::*;
use map::Map;
declare_id!("8gWwwXB7re97tRMnh77RXFEFSx5xrRVbgSUADE4r2Z8Y");
#[error_code]
pub enum Error {
    #[msg("Game has already started.")]
    GameAlreadyStart,
    #[msg("Not enough players to start.")]
    LackPlayer,
}
#[system]
pub mod game_start {

    pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {
        require!(ctx.accounts.map.is_start == false, Error::GameAlreadyStart);
        require!(ctx.accounts.map.game_time == 0, Error::GameAlreadyStart);
        for slot in ctx.accounts.map.players.iter() {
            require!(slot.is_some(), Error::LackPlayer);
        }
        ctx.accounts.map.is_start = true;
        ctx.accounts.map.game_time = 0;
        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub map: Map,
    }
}
