import { forwardRef, useImperativeHandle, useRef, useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Dimensions } from 'react-native';
import Modal, { type ModalType } from '@/components/common/Modal';
import WebView from 'react-native-webview';
import { useTheme } from '@/store/theme/hook';
import { useStatusbarHeight } from '@/store/common/hook';
import { Icon } from '@/components/common/Icon';
import Text from '@/components/common/Text';
import { toast } from '@/utils/tools';
import { sendCaptcha, loginByPhone, buildCookieString, getVerifyInfo, verifyUserInfo } from '@/utils/kugouApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface KgWebLoginModalType {
  show: () => void;
}

// 日志类型
interface LogEntry {
  time: string;
  type: 'info' | 'success' | 'error' | 'request' | 'response';
  message: string;
}

const Header = ({ onClose }: { onClose: () => void }) => {
  const theme = useTheme();
  const statusBarHeight = useStatusbarHeight();

  return (
    <View style={[styles.header, { height: 56 + statusBarHeight, paddingTop: statusBarHeight, backgroundColor: theme['c-content-background'] }]}>
      <TouchableOpacity onPress={onClose} style={styles.backButton} activeOpacity={0.7}>
        <Icon name="chevron-left" size={26} color={theme['c-font']} />
      </TouchableOpacity>
      <Text size={18} weight="600">酷狗音乐登录</Text>
      <View style={styles.placeholder} />
    </View>
  );
};

// 获取当前时间字符串
const getTimeString = () => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
};

// 日志颜色
const getLogColor = (type: LogEntry['type']) => {
  switch (type) {
    case 'info': return '#1677ff';
    case 'success': return '#52c41a';
    case 'error': return '#ff4d4f';
    case 'request': return '#722ed1';
    case 'response': return '#13c2c2';
    default: return '#666666';
  }
};

// 生成悬浮验证 HTML - 直接加载验证码，无中间页
function generateVerifyHtml(txappid: string, ssaCode: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0}
body{background:transparent}
</style>
</head>
<body>
<script>
var appid='${txappid}';
var code='${ssaCode}';

// 修复触摸事件
(function() {
  var lastTouchEnd = 0;
  document.addEventListener('touchend', function(event) {
    var now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
})();

// 直接加载验证码
var s=document.createElement('script');
s.src='https://turing.captcha.qcloud.com/TCaptcha.js';
s.onload=function(){
var c=new TencentCaptcha(appid,function(r){
if(r.ret===0){
window.ReactNativeWebView.postMessage(JSON.stringify({type:'ok',ticket:r.ticket,randstr:r.randstr,appid:appid,code:code}));
}else{
window.ReactNativeWebView.postMessage(JSON.stringify({type:'cancel'}));
}
}, { 
  type: 'popup', 
  enableDarkMode: false, 
  themeColor: '#667eea' 
});
c.show();
};
s.onerror=function(){
window.ReactNativeWebView.postMessage(JSON.stringify({type:'cancel'}));
};
document.head.appendChild(s);
</script>
</body>
</html>`;
}

const KgWebLoginModal = forwardRef<KgWebLoginModalType, object>((props, ref) => {
  const modalRef = useRef<ModalType>(null);
  const theme = useTheme();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isLogging, setIsLogging] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showVerify, setShowVerify] = useState(false);
  const [verifyHtml, setVerifyHtml] = useState('');
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const handleSendCodeRef = useRef<() => void>(() => {});

  // 添加日志
  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev, { time: getTimeString(), type, message }]);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // 处理验证完成
  const handleVerifyComplete = useCallback((success: boolean) => {
    setShowVerify(false);
    if (success) {
      addLog('success', '人机验证通过，自动重新发送验证码...');
      // 验证成功后自动重新发送验证码
      setTimeout(() => {
        handleSendCodeRef.current?.();
      }, 500);
    } else {
      addLog('error', '人机验证失败');
      toast('验证失败，请稍后重试');
    }
  }, [addLog]);

  // 处理验证消息
  const handleVerifyMessage = useCallback(async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('[Verify] 消息:', data);

      if (data.type === 'ok') {
        const verifycode = 'KGCodeTX|' + JSON.stringify({
          ticket: data.ticket,
          randstr: data.randstr,
          txappid: data.appid,
        });

        addLog('info', '提交验证结果...');
        const result = await verifyUserInfo(data.code, 23, verifycode, '', '');

        if (result.success) {
          handleVerifyComplete(true);
        } else {
          addLog('error', '验证提交失败: ' + result.message);
          handleVerifyComplete(false);
        }
      } else if (data.type === 'cancel') {
        handleVerifyComplete(false);
      }
    } catch (e) {
      console.error('[Verify] 错误:', e);
      handleVerifyComplete(false);
    }
  }, [addLog, handleVerifyComplete]);

  useImperativeHandle(ref, () => ({
    show() {
      setPhone('');
      setCode('');
      setIsSendingCode(false);
      setCountdown(0);
      setIsLogging(false);
      setLogs([]);
      setShowVerify(false);
      modalRef.current?.setVisible(true);
    },
  }));

  const handleClose = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setShowVerify(false);
    modalRef.current?.setVisible(false);
  }, []);

  // 发送验证码
  const handleSendCode = useCallback(async () => {
    if (!phone || phone.length < 11) {
      toast('请输入正确的手机号');
      return;
    }

    setIsSendingCode(true);
    addLog('info', `准备发送验证码到: ${phone}`);

    try {
      const result = await sendCaptcha(phone, (msg) => addLog('request', msg));

      if (result.success) {
        addLog('success', '验证码发送成功');
        toast('验证码已发送');
        let seconds = 60;
        setCountdown(seconds);
        countdownRef.current = setInterval(() => {
          seconds -= 1;
          setCountdown(seconds);
          if (seconds <= 0) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
              countdownRef.current = null;
            }
          }
        }, 1000);
      } else if (result.ssaCode) {
        addLog('info', `需要人机验证: ${result.ssaCode}`);
        toast('需要人机验证');
        
        // 获取验证信息
        const verifyResult = await getVerifyInfo(result.ssaCode);
        if (verifyResult.success && verifyResult.data?.txappid) {
          addLog('info', `获取验证信息成功, txappid: ${verifyResult.data.txappid}`);
          // 直接显示悬浮验证
          setVerifyHtml(generateVerifyHtml(verifyResult.data.txappid, result.ssaCode));
          setShowVerify(true);
        } else {
          addLog('error', '获取验证信息失败: ' + verifyResult.message);
        }
      } else {
        addLog('error', `发送失败: ${result.message}`);
        toast(result.message || '发送验证码失败');
      }
    } catch (err: any) {
      addLog('error', `请求异常: ${err.message || err}`);
      toast('发送验证码失败');
    } finally {
      setIsSendingCode(false);
    }
  }, [phone, addLog]);

  // 保持 ref 指向最新的 handleSendCode
  handleSendCodeRef.current = handleSendCode;

  // 登录
  const handleLogin = useCallback(async () => {
    if (!phone || phone.length < 11) {
      toast('请输入正确的手机号');
      return;
    }
    if (!code || code.length < 4) {
      toast('请输入验证码');
      return;
    }

    setIsLogging(true);
    addLog('info', `准备登录: 手机=${phone}`);

    try {
      const result = await loginByPhone(phone, code, (msg) => addLog('request', msg));

      if (result.success && result.data) {
        addLog('success', `登录成功: userid=${result.data.userid}`);
        const cookieString = buildCookieString(result.data);
        global.app_event.emit('kg-cookie-set', cookieString);
        toast('登录成功！');
        handleClose();
      } else {
        addLog('error', `登录失败: ${result.message}`);
        toast(result.message || '登录失败');
      }
    } catch (err: any) {
      addLog('error', `请求异常: ${err.message || err}`);
      toast('登录失败');
    } finally {
      setIsLogging(false);
    }
  }, [phone, code, handleClose, addLog]);

  // 退出登录
  const handleLogout = useCallback(() => {
    Alert.alert('退出登录', '确定要退出酷狗音乐登录吗？', [
      { text: '取消', style: 'cancel' },
      { text: '确定', onPress: () => {
        global.app_event.emit('kg-cookie-set', '');
        addLog('info', '已退出登录');
        toast('已退出登录');
      }},
    ]);
  }, [addLog]);

  return (
    <Modal ref={modalRef} statusBarPadding={false} bgHide={false}>
      <View style={[styles.container, { backgroundColor: theme['c-content-background'] }]}>
        <Header onClose={handleClose} />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
            <Text size={16} weight="600" style={styles.title}>手机号登录</Text>
            <Text size={13} style={[styles.subtitle, { color: theme['c-font-label'] }]}>请使用酷狗音乐账号登录</Text>

            {/* 手机号输入框 */}
            <View style={[styles.inputContainer, { borderColor: theme['c-border'] }]}>
              <Icon name="search-2" size={20} color={theme['c-font-label']} />
              <TextInput
                style={[styles.input, { color: theme['c-font'] }]}
                placeholder="请输入手机号"
                placeholderTextColor={theme['c-font-label']}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={11}
                editable={!isLogging}
              />
            </View>

            {/* 验证码输入框 */}
            <View style={styles.codeRow}>
              <View style={[styles.codeInputContainer, { borderColor: theme['c-border'] }]}>
                <Icon name="setting" size={20} color={theme['c-font-label']} />
                <TextInput
                  style={[styles.input, { color: theme['c-font'] }]}
                  placeholder="请输入验证码"
                  placeholderTextColor={theme['c-font-label']}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!isLogging}
                />
              </View>
              <TouchableOpacity
                style={[styles.sendCodeBtn, { backgroundColor: (countdown > 0 || isSendingCode) ? theme['c-border'] : '#1677ff' }]}
                onPress={handleSendCode}
                disabled={countdown > 0 || isSendingCode || isLogging}
                activeOpacity={0.8}
              >
                <Text size={14} color="#ffffff" weight="500">
                  {countdown > 0 ? `${countdown}s` : isSendingCode ? '发送中...' : '获取验证码'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 登录按钮 */}
            <TouchableOpacity
              style={[styles.loginBtn, { backgroundColor: isLogging ? theme['c-border'] : '#1677ff' }]}
              onPress={handleLogin}
              disabled={isLogging}
              activeOpacity={0.8}
            >
              <Text size={16} color="#ffffff" weight="600">{isLogging ? '登录中...' : '登录'}</Text>
            </TouchableOpacity>

            {/* 退出登录按钮 */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
              <Text size={14} color="#ff6b6b">退出登录</Text>
            </TouchableOpacity>

            {/* 日志显示区域 */}
            <View style={[styles.logContainer, { borderColor: theme['c-border'] }]}>
              <View style={styles.logHeader}>
                <Text size={13} weight="600">日志</Text>
                <TouchableOpacity onPress={() => setLogs([])}>
                  <Text size={12} color="#1677ff">清空</Text>
                </TouchableOpacity>
              </View>
              <ScrollView ref={scrollViewRef} style={styles.logScroll} nestedScrollEnabled>
                {logs.length === 0 ? (
                  <Text size={12} style={[styles.logEmpty, { color: theme['c-font-label'] }]}>暂无日志</Text>
                ) : (
                  logs.map((log, index) => (
                    <View key={index} style={styles.logItem}>
                      <Text size={11} style={styles.logTime}>{log.time}</Text>
                      <Text size={11} style={{ color: getLogColor(log.type), flex: 1 }}>{log.message}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </ScrollView>

        {/* 悬浮验证层 */}
        {showVerify && verifyHtml ? (
          <View style={styles.verifyOverlay}>
            <View style={styles.verifyContainer}>
              <WebView
                source={{ html: verifyHtml }}
                onMessage={handleVerifyMessage}
                style={styles.verifyWebView}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                useWebKit={true}
                cacheEnabled={false}
                incognito={true}
                nestedScrollEnabled={true}
                overScrollMode="never"
                bounces={false}
                setSupportMultipleWindows={false}
                allowsFullscreenVideo={true}
                mediaPlaybackRequiresUserAction={false}
                allowsBackForwardNavigationGestures={false}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
});

export default KgWebLoginModal;

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'column' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: { padding: 8, width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  placeholder: { width: 44 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24 },
  formContainer: { gap: 16 },
  title: { textAlign: 'center', marginBottom: 4 },
  subtitle: { textAlign: 'center', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  codeRow: { flexDirection: 'row', gap: 12 },
  codeInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  input: { flex: 1, fontSize: 16, padding: 0 },
  sendCodeBtn: {
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  loginBtn: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1677ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  logoutBtn: { alignItems: 'center', paddingVertical: 12 },
  logContainer: { borderWidth: 1, borderRadius: 12, marginTop: 16, maxHeight: 200 },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logScroll: { padding: 8 },
  logEmpty: { textAlign: 'center', padding: 16 },
  logItem: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  logTime: { color: '#999999', minWidth: 60 },
  // 悬浮验证层
  verifyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyContainer: {
    width: '95%',
    height: 350,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  verifyWebView: {
    flex: 1,
    width: SCREEN_WIDTH * 0.95,
  },
});