use bolt_lang::*;
use player::Player;
use map::Map;

declare_id!("GQCYq8WK4sRukXoMT7BEmnwmyfB1mpUr2gVAVYFuuH5e");
#[error_code]
pub enum Error{
    #[msg("The game has not started yet.")]
    GameNotStart,
    #[msg("game has been finished")]
    GameFinished,
    #[msg("need more mine to attack")]
    LackMoney,
}
#[system]
pub mod buy_machine {

        pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {
            let machine_price = 10;
            require!(ctx.accounts.map.is_start == true, Error::GameNotStart);
            require!(
                ctx.accounts.map.game_time < ctx.accounts.map.total_game_time,
                Error::GameFinished
            );
            require!(
                ctx.accounts.player.mine_amount > machine_price,
                Error::LackMoney
            );
    
            ctx.accounts.player.mine_amount -= machine_price;
    
            ctx.accounts.player.mining_speed+=1;
            ctx.accounts.map.total_machine_amount += 1;

            Ok(ctx.accounts)
        }
    
        #[system_input]
        pub struct Components {
            pub player: Player,
            pub map: Map,
        }
    
    }