import { extension_settings, loadExtensionSettings } from "../../../extensions.js";
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
async function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
    }
}

// 应用隐藏设置
async function applyHideSettings() {
    const settings = extension_settings[extensionName];
    const chatLength = window.chat?.length || 0;
    
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
    const html = `
        <div id="message-hide-panel" style="position: fixed; right: 10px; top: 200px; width: 150px; 
             background: var(--SmartThemeBlurTintColor); border-radius: 10px; padding: 10px; z-index: 1000;">
            <div style="text-align: center; margin-bottom: 10px;">
                <label>隐藏楼层</label>
                <input type="number" id="hide-count-input" min="0" style="width: 60px;" />
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <button id="advanced-settings-btn" class="menu_button">高级设置</button>
                <button id="apply-hide-btn" class="menu_button">应用</button>
            </div>
            <button id="save-settings-btn" class="menu_button" style="width: 100%;">保存当前设置</button>
        </div>
    `;
    
    jQuery('body').append(html);
}

// 创建高级设置弹窗
function showAdvancedSettings() {
    const settings = extension_settings[extensionName];
    const html = `
        <div class="advanced-settings-popup" style="padding: 20px;">
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <div>
                    <label>起始楼层</label>
                    <input type="number" id="advanced-start" value="${settings.advancedStart}" style="width: 60px;" />
                </div>
                <div>
                    <label>结束楼层</label>
                    <input type="number" id="advanced-end" value="${settings.advancedEnd}" style="width: 60px;" />
                </div>
            </div>
            <div style="text-align: center;">
                <button id="confirm-advanced-settings" class="menu_button">确定</button>
            </div>
        </div>
    `;
    
    callPopup(html, 'text');
}

// 初始化事件监听
function initializeEventListeners() {
    // 隐藏数量输入框事件
    $('#hide-count-input').on('input', async function() {
        const value = parseInt($(this).val()) || 0;
        extension_settings[extensionName].hideCount = value;
        extension_settings[extensionName].isAdvancedMode = false;
        saveSettingsDebounced();
    });
    
    // 高级设置按钮事件
    $('#advanced-settings-btn').on('click', () => {
        showAdvancedSettings();
    });
    
    // 应用按钮事件
    $('#apply-hide-btn').on('click', async () => {
        await applyHideSettings();
    });
    
    // 保存设置按钮事件
    $('#save-settings-btn').on('click', async () => {
        await applyHideSettings();
        saveSettingsDebounced();
        toastr.success('设置已保存');
    });
    
    // 监听高级设置弹窗的确定按钮
    $(document).on('click', '#confirm-advanced-settings', function() {
        const start = parseInt($('#advanced-start').val()) || -1;
        const end = parseInt($('#advanced-end').val()) || (window.chat?.length || 0);
        
        extension_settings[extensionName].advancedStart = start;
        extension_settings[extensionName].advancedEnd = end;
        extension_settings[extensionName].isAdvancedMode = true;
        
        saveSettingsDebounced();
        $('#dialogue_popup').hide();
    });
}

// 插件入口
jQuery(async () => {
    await loadSettings();
    createPanel();
    initializeEventListeners();
    
    // 设置初始值
    $('#hide-count-input').val(extension_settings[extensionName].hideCount);
});
