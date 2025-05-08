use bolt_lang::*;

declare_id!("7e8EGdmfGvcQYhcdonVLXZsBtqs3ajkk5TbqhwgnJvRy");

#[component(delegate)]
pub struct Player {
    #[max_len(20)]

    pub name: String,                        // 玩家昵称
    pub authority: Option<Pubkey>,           // 玩家钱包/控制权
    pub map: Option<Pubkey>,                 // 所属房间/对局ID（可重命名为 room 或 match_id）
    pub stake: f64,                         // 入场金额
    pub reward_account: Option<Pubkey>,// 领奖账户（如有奖励结算）
    pub mine_amount: u64,
    pub mining_speed: u64,
    pub weapon_amount: u64,
    pub can_attack: bool,
    pub cool_down: u64, 
    pub buy_in: f64,
    pub join_time:i64,
}

impl Default for Player {
    fn default() -> Self {
        Self::new(PlayerInit{
            name: "unnamed".to_string(),
            authority: None,
            map: None,
            stake: 0.0,
            reward_account: None,
            mine_amount: 0,
            mining_speed: 0,
            weapon_amount: 0,
            can_attack: true,
            cool_down: 0,
            buy_in: 100.0,
            join_time:0,

        })
    }
}

