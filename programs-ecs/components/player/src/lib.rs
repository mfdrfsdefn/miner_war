use bolt_lang::*;

declare_id!("7e8EGdmfGvcQYhcdonVLXZsBtqs3ajkk5TbqhwgnJvRy");

#[component(delegate)]
pub struct Player {
    #[max_len(20)]
    pub name: String,                        
    pub authority: Option<Pubkey>, 
    pub map: Option<Pubkey>,                                         
    pub reward_account: Option<Pubkey>,
    pub mine_amount: u64,
    pub mining_speed: u64,
    pub weapon_amount: u64,
    pub can_attack: bool,
    pub cool_down: u64, 
    pub buy_in: f64,
    pub join_time:i64,
    pub last_updatetime: i64,
    pub current_game_wallet_balance:f64,
}

impl Default for Player {
    fn default() -> Self {
        Self::new(PlayerInit{
            name: "unnamed".to_string(),
            authority: None,
            map: None,
            reward_account: None,
            mine_amount: 0,
            mining_speed: 0,
            weapon_amount: 0,
            can_attack: true,
            cool_down: 0,
            buy_in: 100.0,
            join_time:0,
            last_updatetime:0,
            current_game_wallet_balance:0.0,
        })
    }
}

