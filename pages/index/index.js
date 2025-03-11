// 保持原有的 Player 类定义
class Player {
    constructor(name, gender, level) {
        this.name = name;
        this.gender = gender;
        this.level = level;
        this.appearances = 0;  // 出场次数
        this.priority = 0;  // 出场优先级（较高的优先考虑）
        this.avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`;
    }
}

// 预设玩家数据
const defaultPlayers = [
    new Player("星星", "女", 3),
    new Player("老袁", "男", 5),
    new Player("yc", "男", 4),
    new Player("元元", "男", 4),
    new Player("panjoy", "男", 4),
    new Player("马大姐", "女", 4.5),
    new Player("cc", "男", 5.5),
    new Player("贾维斯", "男", 5.5),
    new Player("程程", "女", 4),
    new Player("遥远", "男", 3),
    new Player("老麦", "男", 5),
    new Player("vera", "女", 4)
];

// 不期望组合的选手
const defaultHaters = [
    ["yc", "遥远"],
    ["老麦", "程程"]
];

// 期望组合的选手
const defaultGoodPairs = [
    ["老袁", "马大姐"]
];

// 检查配对是否有效
function validPairing(team1, team2) {
    const prefAvoidMixedGender = wx.getStorageSync('prefAvoidMixedGender') !== false;
    
    if (prefAvoidMixedGender) {
        const team1Males = team1.filter(p => p.gender === "男").length;
        const team1Females = team1.length - team1Males;
        const team2Males = team2.filter(p => p.gender === "男").length;
        const team2Females = team2.length - team2Males;

        if ((team1Males === 2 && team2Females === 2) || (team1Females === 2 && team2Males === 2)) {
            return false;
        }
    }
    return true;
}

// 检查历史记录中的匹配次数
function matchInHistory(history, x) {
    const allPairs = [
        [x[0][0][0].name, x[0][0][1].name],
        [x[0][1][0].name, x[0][1][1].name],
        [x[1][0][0].name, x[1][0][1].name],
        [x[1][1][0].name, x[1][1][1].name]
    ];
    let times = 0;
    for (const pairs of allPairs) {
        if (defaultGoodPairs.some(goodPair => goodPair.length === pairs.length && goodPair.every(value => pairs.includes(value)))) {
            times -= 200;
        }
        if (defaultHaters.some(hater => hater.length === pairs.length && hater.every(value => pairs.includes(value)))) {
            times += 200;
        }
        times += history.reduce((acc, past) => acc + (past.length === pairs.length && past.every(value => pairs.includes(value)) ? 1 : 0), 0);
    }
    return times;
}

// 生成对阵安排
function generateMatchups(players) {
    players = players.slice();  // Create a copy of the players array
    players.sort(() => Math.random() - 0.5);  // Shuffle players
    const history = [];  // 记录历史对阵
    let index = 0;
    const matches = []; // 存储所有匹配结果

    // 获取设置
    const totalAppearances = wx.getStorageSync('totalAppearances') || 8;
    const prefBalancedMode = wx.getStorageSync('prefBalancedMode') !== false;
    const prefTwoCourts = wx.getStorageSync('prefTwoCourts') !== false;

    console.log("开始生成对阵，玩家：", players);

    while (players.some(p => p.appearances < totalAppearances)) {
        index += 1;
        // 按照 出场次数（少的优先） 和 优先级（上一场没打优先） 排序
        players.sort((a, b) => a.appearances - b.appearances || b.priority - a.priority);

        // 选择 8 名符合要求的选手
        const availablePlayers = players.filter(p => p.appearances < totalAppearances);
        const selectedPlayers = availablePlayers.slice(0, 8);

        if (selectedPlayers.length < 4) {
            console.log("没有足够的玩家生成对阵");
            break;
        }

        // 更新选手的优先级和出场次数
        players.forEach(p => {
            if (selectedPlayers.includes(p)) {
                p.priority = -1;  // 本轮已出场
                p.appearances += 1;
            } else {
                p.priority += 1;  // 没出场的优先级增加
            }
        });

        // 组合所有可能的 (2+2) vs (2+2) 匹配方式
        const validMatches = [];
        for (let i = 0; i < selectedPlayers.length; i++) {
            for (let j = i + 1; j < selectedPlayers.length; j++) {
                const team1 = [selectedPlayers[i], selectedPlayers[j]];
                const remainingPlayers1 = selectedPlayers.filter(p => !team1.includes(p));
                for (let k = 0; k < remainingPlayers1.length; k++) {
                    for (let l = k + 1; l < remainingPlayers1.length; l++) {
                        const team2 = [remainingPlayers1[k], remainingPlayers1[l]];
                        const remainingPlayers2 = remainingPlayers1.filter(p => !team2.includes(p));
                        for (let m = 0; m < remainingPlayers2.length; m++) {
                            for (let n = m + 1; n < remainingPlayers2.length; n++) {
                                const team3 = [remainingPlayers2[m], remainingPlayers2[n]];
                                const team4 = remainingPlayers2.filter(p => !team3.includes(p));

                                // 确保性别匹配
                                if (validPairing(team1, team2) && validPairing(team3, team4)) {
                                    // 计算等级差
                                    const level1 = team1.reduce((sum, p) => sum + p.level, 0);
                                    const level2 = team2.reduce((sum, p) => sum + p.level, 0);
                                    const level3 = team3.reduce((sum, p) => sum + p.level, 0);
                                    const level4 = team4.reduce((sum, p) => sum + p.level, 0);
                                    const diff1 = Math.abs(level1 - level2);
                                    const diff2 = Math.abs(level3 - level4);

                                    // 根据势均力敌模式检查等级差
                                    const levelDiffLimit = prefBalancedMode ? 1 : 2;
                                    if (diff1 <= levelDiffLimit && diff2 <= levelDiffLimit) {
                                        // 记录匹配选项
                                        validMatches.push([[team1, team2], [team3, team4], diff1 + diff2]);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (validMatches.length === 0) {
            console.log("没有找到有效的匹配");
            break;
        }

        // 找到最优的匹配，尽量避免重复搭配
        validMatches.sort((a, b) => matchInHistory(history, a) - matchInHistory(history, b));

        // 选择最佳匹配
        const bestMatch = validMatches[0];
        history.push([bestMatch[0][0][0].name, bestMatch[0][0][1].name]);
        history.push([bestMatch[0][1][0].name, bestMatch[0][1][1].name]);
        history.push([bestMatch[1][0][0].name, bestMatch[1][0][1].name]);
        history.push([bestMatch[1][1][0].name, bestMatch[1][1][1].name]);

        // 存储本轮匹配结果
        const [[team1, team2], [team3, team4], diff] = bestMatch;
        matches.push({
            round: index,
            match: 2 * index - 1,
            team1: {
                players: team1,
                level: team1.reduce((sum, p) => sum + p.level, 0)
            },
            team2: {
                players: team2,
                level: team2.reduce((sum, p) => sum + p.level, 0)
            }
        });

        // 如果启用两个场地，添加第二场比赛
        if (prefTwoCourts) {
            matches.push({
                round: index,
                match: 2 * index,
                team1: {
                    players: team3,
                    level: team3.reduce((sum, p) => sum + p.level, 0)
                },
                team2: {
                    players: team4,
                    level: team4.reduce((sum, p) => sum + p.level, 0)
                }
            });
        }
    }

    // 重置所有选手的出场次数（为下一次生成做准备）
    players.forEach(p => {
        p.appearances = 0;
        p.priority = 0;
    });

    console.log("生成的对阵结果：", matches);
    return matches;
}

Page({
    data: {
        players: defaultPlayers,
        matches: [],
        haters: defaultHaters,
        goodPairs: defaultGoodPairs,
        newPlayer: {
            name: '',
            gender: '男',
            level: 3
        }
    },

    onLoad() {
        // 从本地存储加载数据，如果没有则使用默认数据
        let players = wx.getStorageSync('players');
        let haters = wx.getStorageSync('haters');
        let goodPairs = wx.getStorageSync('goodPairs');

        // 如果本地存储为空，使用默认值
        if (!players || players.length === 0) {
            players = defaultPlayers;
            wx.setStorageSync('players', players);
        }

        if (!haters || haters.length === 0) {
            haters = defaultHaters;
            wx.setStorageSync('haters', haters);
        }

        if (!goodPairs || goodPairs.length === 0) {
            goodPairs = defaultGoodPairs;
            wx.setStorageSync('goodPairs', goodPairs);
        }
        
        this.setData({ 
            players,
            haters,
            goodPairs
        });

        // 打印数据用于调试
        console.log('Index Page - Players:', players);
        console.log('Index Page - Haters:', haters);
        console.log('Index Page - GoodPairs:', goodPairs);
    },

    deletePlayer(e) {
        const index = e.currentTarget.dataset.index;
        const players = this.data.players.filter((_, i) => i !== index);
        this.setData({ players });
        wx.setStorageSync('players', players);
    },

    onNameInput(e) {
        this.setData({
            'newPlayer.name': e.detail.value
        });
    },

    onGenderChange(e) {
        this.setData({
            'newPlayer.gender': e.detail.value
        });
    },

    onLevelChange(e) {
        this.setData({
            'newPlayer.level': e.detail.value
        });
    },

    addPlayer() {
        if (!this.data.newPlayer.name) {
            wx.showToast({
                title: '请输入姓名',
                icon: 'none'
            });
            return;
        }

        // 检查是否已存在同名选手
        if (this.data.players.some(p => p.name === this.data.newPlayer.name)) {
            wx.showToast({
                title: '该选手已存在',
                icon: 'none'
            });
            return;
        }

        const newPlayer = new Player(
            this.data.newPlayer.name,
            this.data.newPlayer.gender,
            this.data.newPlayer.level
        );

        const players = [...this.data.players, newPlayer];
        this.setData({
            players,
            newPlayer: {
                name: '',
                gender: '男',
                level: 3
            }
        });

        wx.setStorageSync('players', players);
    },

    startMatching() {
        if (this.data.players.length < 4) {
            wx.showToast({
                title: '至少需要4名选手',
                icon: 'none'
            });
            return;
        }

        wx.navigateTo({
            url: '/pages/preferences/preferences'
        });
    },

    startMatchingFromPreferences() {
        // 从本地存储获取最新的设置
        const haters = wx.getStorageSync('haters') || [];
        const goodPairs = wx.getStorageSync('goodPairs') || [];
        const totalAppearances = wx.getStorageSync('totalAppearances') || 2;

        console.log("当前玩家：", this.data.players);
        
        // 生成匹配
        const matches = generateMatchups(this.data.players);
        console.log("生成的对阵：", matches);

        // 将匹配数据存储到本地
        wx.setStorageSync('currentMatches', matches);

        // 跳转到对阵页面
        wx.navigateTo({
            url: '/pages/matchups/matchups'
        });
    }
});
