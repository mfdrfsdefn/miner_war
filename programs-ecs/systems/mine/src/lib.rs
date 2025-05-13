use bolt_lang::*;
use player::Player;
use map::Map;
declare_id!("4n8unqB9VVCBKx6nWwJKtU9MSSvm7AooKcF3H3dUkNJz");
#[error_code]
pub enum Error{
    #[msg("The game has not started yet.")]
    GameNotStart,
    #[msg("game has been finished")]
    GameFinished,


}
#[system]
pub mod mine{
    pub fn execute(ctx: Context<Components>, _args: Vec<u8> ) -> Result<Components> {
        require!(ctx.accounts.map.is_start == true, Error::GameNotStart);
        require!(ctx.accounts.map.game_time < ctx.accounts.map.total_game_time, Error::GameFinished);
        
        ctx.accounts.player1.mine_amount += ctx.accounts.player1.mining_speed * ctx.accounts.map.real_mining_speed;
        ctx.accounts.player2.mine_amount += ctx.accounts.player2.mining_speed * ctx.accounts.map.real_mining_speed;
        ctx.accounts.map.mine_amount += (ctx.accounts.player1.mining_speed +ctx.accounts.player2.mining_speed )* ctx.accounts.map.real_mining_speed;
        ctx.accounts.map.game_time += 1;
        Ok(ctx.accounts)
    }




    #[system_input]
    pub struct Components {
        pub map: Map,
        pub player1: Player,
        pub player2: Player,
    }

}



