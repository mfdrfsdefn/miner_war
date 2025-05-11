use bolt_lang::*;
use player::Player;
use map::Map;
declare_id!("HEqNqfq7WKJu5xa6qjdsMFjWe7bu5qr1L7Cr5ExsPSBL");
#[error_code]
pub enum Error{
    #[msg("The game has not started yet.")]
    GameNotStart,
    #[msg("game has been finished")]
    GameFinished,
    #[msg("need more mine to attack")]
    LackBattleFee,
    #[msg("Still freezing")]
    AttackFrozen,   

}
#[system]
pub mod battle {

    pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {
        let battle_fee = 100;
        let reward_ratio = 0.05;
        require!(ctx.accounts.map.is_start == true, Error::GameNotStart);
        require!(
            ctx.accounts.map.game_time < ctx.accounts.map.total_game_time,
            Error::GameFinished
        );
        // require!(
        //     ctx.accounts.player_attack.can_attack == true,
        //     Error::AttackFrozen
        // );
        require!(
            ctx.accounts.player_attack.mine_amount > battle_fee,
            Error::LackBattleFee
        );

        ctx.accounts.player_attack.mine_amount -= battle_fee;

        let attack_weapon = ctx.accounts.player_attack.weapon_amount;
        let attacked_weapon = ctx.accounts.player_attacked.weapon_amount;
        if attack_weapon > attacked_weapon {

            let reward = (ctx.accounts.player_attacked.mine_amount as f64 * reward_ratio) as u64;
            ctx.accounts.player_attack.mine_amount += reward;
            ctx.accounts.player_attacked.mine_amount -= reward;
            
            ctx.accounts.player_attack.weapon_amount -= attacked_weapon;
            ctx.accounts.player_attacked.weapon_amount = 0;
        } else if attack_weapon < attacked_weapon {

            let reward = (ctx.accounts.player_attack.mine_amount as f64 * reward_ratio) as u64;
            ctx.accounts.player_attacked.mine_amount += reward;
            ctx.accounts.player_attack.mine_amount -= reward;

            ctx.accounts.player_attacked.weapon_amount -= attack_weapon;
            ctx.accounts.player_attack.weapon_amount = 0;
        } else {

            ctx.accounts.player_attack.weapon_amount = 0;
            ctx.accounts.player_attacked.weapon_amount = 0;
        }


        //ctx.accounts.player_attack.can_attack = false;

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub player_attack: Player,
        pub player_attacked: Player,
        pub map:Map,
    }

}