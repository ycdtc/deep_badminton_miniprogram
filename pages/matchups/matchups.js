Page({
    data: {
        matches: []
    },

    onLoad(options) {
        console.log("对阵页面加载");
        
        // 从本地存储获取匹配数据
        const matches = wx.getStorageSync('currentMatches');
        console.log("获取到的对阵数据：", matches);
        
        if (matches && matches.length > 0) {
            this.setData({
                matches: matches
            }, () => {
                console.log("对阵页面当前数据：", this.data.matches);
            });
        } else {
            console.log("无法获取对阵数据");
            wx.showToast({
                title: '生成对阵失败',
                icon: 'none'
            });
        }
    },

    regenerateMatches() {
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        
        if (prevPage) {
            prevPage.startMatchingFromPreferences();
        }
    },

    confirmMatches() {
        wx.showToast({
            title: '已确认对阵',
            icon: 'success'
        });
    }
});
