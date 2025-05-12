Page({
    data: {
        matches: [],
        rankings: [],
        activeTab: 'matches',
        showScoreModal: false,
        scoreModalFocus: false,
        tempScore1: '',
        tempScore2: '',
        currentMatchIndex: -1,
        shareMode: false    // 标记是否是通过分享打开的页面
    },

    onLoad(options) {
        console.log("对阵页面加载, options:", options);
        
        // 检查是否有分享参数
        if (options && options.shareData) {
            try {
                // 解码分享数据
                const decodedData = decodeURIComponent(options.shareData);
                const sharedMatches = JSON.parse(decodedData);
                console.log("从分享链接解析的对阵数据:", sharedMatches);
                
                this.setData({
                    matches: sharedMatches,
                    activeTab: 'matches',
                    shareMode: true
                }, () => {
                    console.log("已加载分享的对阵数据");
                    this.updateRankings();
                });
                return;
            } catch (e) {
                console.error("解析分享数据出错:", e);
            }
        }
        
        // 如果没有分享参数或解析失败，则加载本地数据
        this.loadData();
    },

    onShow() {
        console.log("对阵页面显示");
        // 如果不是分享模式，则重新加载数据
        if (!this.data.shareMode) {
            this.loadData();
        }
    },

    loadData() {
        // 从本地存储获取匹配数据
        const matches = wx.getStorageSync('currentMatches') || [];
        console.log("获取到的对阵数据：", matches);
        
        if (matches && matches.length > 0) {
            this.setData({
                matches: matches,
                activeTab: 'matches' // 确保默认标签页为对阵表
            }, () => {
                console.log("对阵页面当前数据已设置：", this.data.matches);
                this.updateRankings();
            });
        } else {
            console.log("无法获取对阵数据或数据为空");
            wx.showToast({
                title: '未找到对阵数据',
                icon: 'none'
            });
        }
    },

    switchTab(e) {
        const tab = e.currentTarget.dataset.tab;
        console.log("切换到标签页：", tab);
        this.setData({
            activeTab: tab
        }, () => {
            console.log("当前活动标签页：", this.data.activeTab);
            if (tab === 'rankings') {
                this.updateRankings();
            }
        });
    },

    editScore(e) {
        // 分享模式下不允许编辑
        if (this.data.shareMode) {
            wx.showToast({
                title: '分享模式下无法编辑',
                icon: 'none'
            });
            return;
        }
        
        const matchIndex = e.currentTarget.dataset.matchIndex;
        console.log("编辑比分，比赛索引：", matchIndex);
        const match = this.data.matches[matchIndex];
        
        // 使用自定义对话框替代wx.showModal
        this.setData({
            showScoreModal: true,
            scoreModalFocus: true,
            currentMatchIndex: matchIndex,
            tempScore1: match.score1 || '',
            tempScore2: match.score2 || ''
        });
    },

    onScore1Input(e) {
        this.setData({
            tempScore1: e.detail.value
        });
    },

    onScore2Input(e) {
        this.setData({
            tempScore2: e.detail.value
        });
    },

    cancelScoreEdit() {
        this.setData({
            showScoreModal: false,
            scoreModalFocus: false,
            currentMatchIndex: -1,
            tempScore1: '',
            tempScore2: ''
        });
    },

    confirmScoreEdit() {
        const { currentMatchIndex, tempScore1, tempScore2 } = this.data;
        
        if (currentMatchIndex < 0) {
            return;
        }

        // 直接转换输入值为数字，不做额外校验
        // 确保输入为数字，如果无法转换则默认为0
        const score1 = tempScore1 === '' ? 0 : (parseInt(tempScore1) || 0);
        const score2 = tempScore2 === '' ? 0 : (parseInt(tempScore2) || 0);

        console.log("即将更新比分：", score1, ":", score2);

        const matches = [...this.data.matches];
        matches[currentMatchIndex] = {
            ...matches[currentMatchIndex],
            score1: score1,
            score2: score2
        };
        
        // 确保深度复制对象，并立即更新UI
        this.setData({ 
            matches: JSON.parse(JSON.stringify(matches)),
            showScoreModal: false,
            scoreModalFocus: false,
            currentMatchIndex: -1,
            tempScore1: '',
            tempScore2: ''
        }, () => {
            console.log("比分已更新：", this.data.matches[currentMatchIndex]);
            wx.setStorageSync('currentMatches', this.data.matches);
            this.updateRankings();
        });
    },

    updateRankings() {
        console.log("开始更新排行榜");
        
        // 创建玩家统计数据
        const playerStats = new Map();
        
        // 初始化所有玩家的数据
        this.data.matches.forEach(match => {
            [...match.team1.players, ...match.team2.players].forEach(player => {
                if (!playerStats.has(player.name)) {
                    playerStats.set(player.name, {
                        name: player.name,
                        avatar: player.avatar || "/images/default-avatar.png",
                        wins: 0,
                        pointDiff: 0
                    });
                }
            });
        });

        // 统计每场比赛的结果
        this.data.matches.forEach((match, idx) => {
            // 确保分数存在且为数值类型
            if (match.score1 !== undefined && match.score2 !== undefined) {
                const score1 = Number(match.score1);
                const score2 = Number(match.score2);
                
                console.log(`第${idx+1}场比分: ${score1}:${score2}`);
                
                if (isNaN(score1) || isNaN(score2)) {
                    console.log(`第${idx+1}场比分无效`);
                    return;
                }
                
                const team1Won = score1 > score2;
                const pointDiff = score1 - score2;

                // 更新队伍1的数据
                match.team1.players.forEach(player => {
                    const stats = playerStats.get(player.name);
                    if (stats) {
                        if (team1Won) stats.wins++;
                        stats.pointDiff += pointDiff;
                    }
                });

                // 更新队伍2的数据
                match.team2.players.forEach(player => {
                    const stats = playerStats.get(player.name);
                    if (stats) {
                        if (!team1Won && score1 !== score2) stats.wins++;
                        stats.pointDiff -= pointDiff;
                    }
                });
            }
        });

        // 转换为数组并排序
        const rankings = Array.from(playerStats.values()).sort((a, b) => {
            if (a.wins !== b.wins) return b.wins - a.wins;
            return b.pointDiff - a.pointDiff;
        });

        console.log("排行榜计算完成：", rankings);

        this.setData({ rankings }, () => {
            console.log("排行榜已更新：", this.data.rankings);
        });
    },

    regenerateMatches() {
        if (this.data.shareMode) {
            wx.showToast({
                title: '分享模式下无法重新生成',
                icon: 'none'
            });
            return;
        }
        
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        
        if (prevPage) {
            prevPage.startMatchingFromPreferences();
        }
    },
    
    // 实现分享功能
    onShareAppMessage() {
        // 将matches数据序列化为JSON字符串
        const matchesData = JSON.stringify(this.data.matches);
        const encodedData = encodeURIComponent(matchesData);
        
        console.log("准备分享数据，大小：", encodedData.length);
        
        return {
            title: '羽毛球对阵安排',
            path: `/pages/matchups/matchups?shareData=${encodedData}`,
            success: function(res) {
                console.log("分享成功", res);
                wx.showToast({
                    title: '分享成功',
                    icon: 'success'
                });
            },
            fail: function(res) {
                console.log("分享失败", res);
                wx.showToast({
                    title: '分享失败',
                    icon: 'none'
                });
            }
        }
    },
    
    // 分享到朋友圈
    onShareTimeline() {
        const matchesData = JSON.stringify(this.data.matches);
        const encodedData = encodeURIComponent(matchesData);
        
        return {
            title: '羽毛球对阵安排',
            query: `shareData=${encodedData}`,
            imageUrl: '/images/share-image.png' // 可选，分享图片
        }
    }
});
