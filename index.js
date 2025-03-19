import { extension_settings, getContext } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";
import { hideChatMessageRange } from "../../../../chat.js";

// 插件名称
const extensionName = "message-hide";

// 默认设置
const defaultSettings = {
    hideCount: 0,
    advancedStart: -1,
    advancedEnd: -1,
    isAdvancedMode: false
};

// 加载设置
function loadSettings() {
    // 初始化插件设置
    if (!extension_settings[extensionName]) {
        extension_settings[extensionName] = {};
    }
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
    }
}

// 应用隐藏设置
async function applyHideSettings() {
    const settings = extension_settings[extensionName];
    const chat = getContext().chat;
    const chatLength = chat?.length || 0;
    
    if (chatLength === 0) return;

    // 先取消所有隐藏
    await hideChatMessageRange(0, chatLength - 1, true);
    
    if (settings.isAdvancedMode) {
        // 高级模式：使用指定范围
        if (settings.advancedStart >= -1 && settings.advancedEnd > settings.advancedStart) {
            const start = Math.max(0, settings.advancedStart + 1);
            const end = Math.min(chatLength - 1, settings.advancedEnd - 1);
            if (start < end) {
                await hideChatMessageRange(start, end);
            }
        }
    } else {
        // 基本模式：隐藏最后N条之前的消息
        if (settings.hideCount > 0 && chatLength > settings.hideCount) {
            await hideChatMessageRange(0, chatLength - settings.hideCount - 1);
        }
    }
}

// 创建UI面板
function createPanel() {
    const settingsHtml = `
        <div id="message-hide-panel">
            <div class="hide-count-container">
                <label>隐藏楼层</label>
                <input type="number" id="hide-count-input" min="0" />
            </div>
            <div class="button-container">
                <button id="advanced-settings-btn" class="menu_button">高级设置</button>
                <button id="apply-hide-btn" class="menu_button">应用</button>
            </div>
            <button id="save-settings-btn" class="menu_button">保存当前设置</button>
        </div>
    `;

    // 添加到body
    $('body').append(settingsHtml);
}

// 创建高级设置弹窗
function showAdvancedSettings() {
    const settings = extension_settings[extensionName];
    const popupHtml = `
        <div class="advanced-settings-popup">
            <div class="input-group">
                <div>
                    <label>起始楼层</label>
                    <input type="number" id="advanced-start" value="${settings.advancedStart}" />
                </div>
                <div>
                    <label>结束楼层</label>
                    <input type="number" id="advanced-end" value="${settings.advancedEnd}" />
                </div>
            </div>
            <div class="button-container">
                <button id="confirm-advanced-settings" class="menu_button">确定</button>
            </div>
        </div>
    `;
    
    callPopup(popupHtml, 'text');
}

// 初始化事件监听
function initializeEventListeners() {
    // 隐藏数量输入框事件
    $(document).on('input', '#hide-count-input', function() {
        const value = parseInt($(this).val()) || 0;
        extension_settings[extensionName].hideCount = value;
        extension_settings[extensionName].isAdvancedMode = false;
        saveSettingsDebounced();
    });
    
    // 高级设置按钮事件
    $(document).on('click', '#advanced-settings-btn', function() {
        showAdvancedSettings();
    });
    
    // 应用按钮事件
    $(document).on('click', '#apply-hide-btn', async function() {
        await applyHideSettings();
        toastr.success('已应用隐藏设置');
    });
    
    // 保存设置按钮事件
    $(document).on('click', '#save-settings-btn', async function() {
        await applyHideSettings();
        saveSettingsDebounced();
        toastr.success('设置已保存');
    });
    
    // 监听高级设置弹窗的确定按钮
    $(document).on('click', '#confirm-advanced-settings', function() {
        const start = parseInt($('#advanced-start').val()) || -1;
        const end = parseInt($('#advanced-end').val()) || (getContext().chat?.length || 0);
        
        extension_settings[extensionName].advancedStart = start;
        extension_settings[extensionName].advancedEnd = end;
        extension_settings[extensionName].isAdvancedMode = true;
        
        saveSettingsDebounced();
        $('#dialogue_popup').hide();
        toastr.success('高级设置已保存');
    });
}

// 插件入口
jQuery(async () => {
    loadSettings();
    
    // 等待 DOM 完全加载
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    createPanel();
    initializeEventListeners();
    
    // 设置初始值
    $('#hide-count-input').val(extension_settings[extensionName].hideCount);
});
