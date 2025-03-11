Page({
    data: {
        players: [],
        haters: [],
        goodPairs: [],
        player1: null,
        player2: null,
        goodPlayer1: null,
        goodPlayer2: null,
        totalAppearances: 8,
        prefBalancedMode: true,
        prefTwoCourts: true,
        prefAvoidMixedGender: true
    },

    onLoad(options) {
        // 获取主页面的数据
        const pages = getCurrentPages();
        const mainPage = pages[pages.length - 2];
        const players = mainPage.data.players;

        // 从本地存储获取设置，如果没有则使用主页面的默认值
        let haters = wx.getStorageSync('haters');
        let goodPairs = wx.getStorageSync('goodPairs');

        // 如果本地存储为空，使用主页面的值
        if (!haters || haters.length === 0) {
            haters = mainPage.data.haters;
        }

        if (!goodPairs || goodPairs.length === 0) {
            goodPairs = mainPage.data.goodPairs;
        }

        // 获取其他设置
        const totalAppearances = wx.getStorageSync('totalAppearances') || 8;
        const prefBalancedMode = wx.getStorageSync('prefBalancedMode') !== false;
        const prefTwoCourts = wx.getStorageSync('prefTwoCourts') !== false;
        const prefAvoidMixedGender = wx.getStorageSync('prefAvoidMixedGender') !== false;

        // 更新页面数据
        this.setData({
            players,
            haters,
            goodPairs,
            totalAppearances,
            prefBalancedMode,
            prefTwoCourts,
            prefAvoidMixedGender
        });

        // 打印数据，用于调试
        console.log('Preferences Page - Players:', players);
        console.log('Preferences Page - Haters:', haters);
        console.log('Preferences Page - GoodPairs:', goodPairs);
    },

    onPlayer1Change(e) {
        const index = e.detail.value;
        this.setData({
            player1: this.data.players[index]
        });
    },

    onPlayer2Change(e) {
        const index = e.detail.value;
        this.setData({
            player2: this.data.players[index]
        });
    },

    onGoodPlayer1Change(e) {
        const index = e.detail.value;
        this.setData({
            goodPlayer1: this.data.players[index]
        });
    },

    onGoodPlayer2Change(e) {
        const index = e.detail.value;
        this.setData({
            goodPlayer2: this.data.players[index]
        });
    },

    decreaseAppearances() {
        if (this.data.totalAppearances > 1) {
            this.setData({
                totalAppearances: this.data.totalAppearances - 1
            });
        }
    },

    increaseAppearances() {
        if (this.data.totalAppearances < 20) {
            this.setData({
                totalAppearances: this.data.totalAppearances + 1
            });
        }
    },

    onAppearancesInput(e) {
        let value = parseInt(e.detail.value);
        if (isNaN(value)) value = 8;
        if (value < 1) value = 1;
        if (value > 20) value = 20;
        this.setData({
            totalAppearances: value
        });
    },

    toggleBalancedMode() {
        this.setData({
            prefBalancedMode: !this.data.prefBalancedMode
        });
    },

    toggleTwoCourts() {
        this.setData({
            prefTwoCourts: !this.data.prefTwoCourts
        });
    },

    toggleAvoidMixedGender() {
        this.setData({
            prefAvoidMixedGender: !this.data.prefAvoidMixedGender
        });
    },

    addHater() {
        if (!this.data.player1 || !this.data.player2) {
            wx.showToast({
                title: '请选择两名选手',
                icon: 'none'
            });
            return;
        }

        if (this.data.player1.name === this.data.player2.name) {
            wx.showToast({
                title: '不能选择同一名选手',
                icon: 'none'
            });
            return;
        }

        const newPair = [this.data.player1.name, this.data.player2.name].sort();
        if (this.data.haters.some(pair => 
            pair[0] === newPair[0] && pair[1] === newPair[1]
        )) {
            wx.showToast({
                title: '该组合已存在',
                icon: 'none'
            });
            return;
        }

        this.setData({
            haters: [...this.data.haters, newPair],
            player1: null,
            player2: null
        });
    },

    addGoodPair() {
        if (!this.data.goodPlayer1 || !this.data.goodPlayer2) {
            wx.showToast({
                title: '请选择两名选手',
                icon: 'none'
            });
            return;
        }

        if (this.data.goodPlayer1.name === this.data.goodPlayer2.name) {
            wx.showToast({
                title: '不能选择同一名选手',
                icon: 'none'
            });
            return;
        }

        const newPair = [this.data.goodPlayer1.name, this.data.goodPlayer2.name].sort();
        if (this.data.goodPairs.some(pair => 
            pair[0] === newPair[0] && pair[1] === newPair[1]
        )) {
            wx.showToast({
                title: '该组合已存在',
                icon: 'none'
            });
            return;
        }

        this.setData({
            goodPairs: [...this.data.goodPairs, newPair],
            goodPlayer1: null,
            goodPlayer2: null
        });
    },

    deleteHater(e) {
        const index = e.currentTarget.dataset.index;
        const haters = this.data.haters.filter((_, i) => i !== index);
        this.setData({ haters });
    },

    deleteGoodPair(e) {
        const index = e.currentTarget.dataset.index;
        const goodPairs = this.data.goodPairs.filter((_, i) => i !== index);
        this.setData({ goodPairs });
    },

    saveAndStart() {
        // 保存设置
        wx.setStorageSync('haters', this.data.haters);
        wx.setStorageSync('goodPairs', this.data.goodPairs);
        wx.setStorageSync('totalAppearances', this.data.totalAppearances);
        wx.setStorageSync('prefBalancedMode', this.data.prefBalancedMode);
        wx.setStorageSync('prefTwoCourts', this.data.prefTwoCourts);
        wx.setStorageSync('prefAvoidMixedGender', this.data.prefAvoidMixedGender);

        // 返回上一页并触发匹配
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        
        // 先生成对阵
        prevPage.startMatchingFromPreferences();

        // 等待一下确保对阵生成完成
        setTimeout(() => {
            // 跳转到对阵安排页面
            wx.navigateTo({
                url: '/pages/matchups/matchups',
                fail: function(err) {
                    console.error('Navigation failed:', err);
                    wx.showToast({
                        title: '页面跳转失败',
                        icon: 'none'
                    });
                }
            });
        }, 100);
    },

    cancel() {
        wx.navigateBack();
    }
});
