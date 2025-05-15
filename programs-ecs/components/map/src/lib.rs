use bolt_lang::*;

declare_id!("H55UcuGxCmpH1cE6Tsm8EUYVdQz99AHhwBN551jUW8a1");

#[component(delegate)]
pub struct Map {
    pub mine_remain: u64,
    pub total_machine_amount: u64,
    pub real_mining_speed: u64,
    pub authority: Option<Pubkey>,
    pub buy_in:f64,
    pub players: [Option<Pubkey>; 2],
    pub total_game_time:i64,
    pub game_time: i64,
    pub is_start: bool, 
    pub mine_amount: u64,

}

impl Default for Map {
    fn default() -> Self {
        Self::new(MapInit{
            mine_remain: 0,
            total_machine_amount: 0,
            real_mining_speed: 10,
            authority:None,
            buy_in:0.0,
            players: [None, None],
            total_game_time:600,
            game_time:0,
            is_start: false,  
            mine_amount: 0,
        })
    }
}
