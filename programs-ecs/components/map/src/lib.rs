use bolt_lang::*;

declare_id!("HHAJcQfjE8YTi8g4aFJot4AMdoWCzHGzFasGC4PZ5mnH");

#[component(delegate)]
pub struct Map {
    #[max_len(20)]

    pub mine_remain: u64,
    pub total_machine_amount: u64,
    pub real_mining_speed: u64,
    pub authority: Option<Pubkey>,
    pub buy_in:f64,
}

impl Default for Map {
    fn default() -> Self {
        Self::new(MapInit{
            mine_remain: 0,
            total_machine_amount: 0,
            real_mining_speed: 0,
            authority:None,
            buy_in:100.0,
        })
    }
}
