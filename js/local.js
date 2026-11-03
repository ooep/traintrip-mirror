/* TRAIN TRIP 中文本地版 - 本地交互层（1:1 镜像原站框架） */
(function () {
  "use strict";

  var KEY = "traintrip_cn_stamps_v1";
  var STAMPS = {};
  try { STAMPS = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { STAMPS = {}; }

  function save() { localStorage.setItem(KEY, JSON.stringify(STAMPS)); }
  function has(id) { return !!STAMPS[id]; }
  function add(id) { if (!STAMPS[id]) { STAMPS[id] = { t: Date.now() }; save(); fire(); } }
  function remove(id) { if (STAMPS[id]) { delete STAMPS[id]; save(); fire(); } }
  function count() { return Object.keys(STAMPS).length; }
  function fire() { try { window.dispatchEvent(new CustomEvent("stampchange")); } catch (e) {} }

  /* ---------- 全局菜单开关（原站 #menuBtn / .global-menu） ---------- */
  function initMenu() {
    var btn = document.getElementById("menuBtn");
    var menu = document.querySelector(".global-menu");
    if (!btn || !menu) return;
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var show = menu.style.display === "none" || menu.style.display === "";
      menu.style.display = show ? "block" : "none";
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { menu.style.display = "none"; });
    });
    document.addEventListener("click", function (e) {
      if (!menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
        menu.style.display = "none";
      }
    });
  }

  /* ---------- 弹窗关闭（原站 .c-close / .close / .button-close） ---------- */
  function initModals() {
    document.querySelectorAll(".c-close, .c-popupModal .close, .c-overlayModal .c-close, .button-close").forEach(function (el) {
      el.addEventListener("click", function () {
        var modal = el.closest(".c-popupModal, .c-overlayModal");
        if (modal) modal.style.display = "none";
      });
    });
    document.querySelectorAll(".overlay").forEach(function (ov) {
      ov.addEventListener("click", function () {
        var modal = ov.closest(".c-popupModal, .c-overlayModal");
        if (modal) modal.style.display = "none";
      });
    });
    // 玩法指南的「跳过」/「开始」按钮：关闭教程层
    document.querySelectorAll(".skip-button, .start-button, .is-skip, .tutorial .close").forEach(function (el) {
      el.addEventListener("click", function () {
        var layer = el.closest("section, .c-popupModal, .c-overlayModal, .tutorial, .howto");
        if (layer) layer.style.display = "none";
        else el.style.display = "none";
      });
    });
  }

  /* ---------- 登录页本地化（移除登录验证） ---------- */
  function initLogin() {
    if (!document.body.classList.contains("page-login") && !document.querySelector(".c-login")) return;
    document.querySelectorAll("a[href*='sns'], a[href*='line'], a[href*='twitter'], a[href*='x.com']").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); localLoginNote(); });
    });
    document.querySelectorAll("button").forEach(function (b) {
      if (/LINE|X（|X \(/.test(b.textContent)) b.addEventListener("click", function (e) { e.preventDefault(); localLoginNote(); });
    });
    var guest = document.querySelector("a");
    document.querySelectorAll("a, button").forEach(function (el) {
      if (/无需登录/.test(el.textContent)) {
        el.addEventListener("click", function (e) {
          e.preventDefault();
          location.href = "list.html";
        });
      }
    });
    function localLoginNote() {
      var note = document.createElement("div");
      note.style.cssText = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;border:2px solid #02af00;border-radius:12px;padding:20px 24px;z-index:9999;max-width:80%;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.15);font-size:14px;line-height:1.8;";
      note.innerHTML = "本为中文本地版，已移除全部登录・注册验证。<br>印章收集保存在本机浏览器（localStorage）。<br><br><a href=\"list.html\" style=\"display:inline-block;background:#02af00;color:#fff;border-radius:8px;padding:8px 24px;text-decoration:none;\">直接开始体验</a>";
      var close = document.createElement("button");
      close.textContent = "关闭";
      close.style.cssText = "margin-top:10px;display:block;width:100%;padding:6px;border:1px solid #ccc;border-radius:8px;background:#fff;cursor:pointer;";
      close.addEventListener("click", function () { note.remove(); });
      note.appendChild(close);
      document.body.appendChild(note);
    }
  }

  /* ---------- find 页：站点列表注入 + 本地盖章 ---------- */
  var STATION_DATA = [];
  var GROUP_CN = { "JR北海道": "JR北海道", "JR東日本": "JR东日本", "JR東海": "JR东海", "JR西日本": "JR西日本", "JR四国": "JR四国", "JR九州": "JR九州" };
  var AREA_CN = {};

  function stationLabel(name) {
    if (!name) return "";
    // 补充音译/意译表（片假名・特殊名，按完整名匹配）
    var SUP = {
      "ニセコ": "二世谷", "トマム": "托马姆", "ロイズタウン": "罗伊兹镇",
      "特急フラノラベンダーエクスプレス": "特急富良野薰衣草快车",
      "キハ261系0代": "Kiha261系0代", "キハ261系1000代": "Kiha261系1000代",
      "快速リゾートしらかみ": "快速度假白神", "SLぐんま みなかみ": "SL群马 水上",
      "高輪ゲートウェイ": "高轮Gateway", "サフィール踊り子": "Saphir踊子",
      "さいたま新都心": "埼玉新都心", "勝沼ぶどう郷": "胜沼葡萄乡", "ほっとゆだ": "穗止汤田",
      "SLばんえつ物語": "SL磐越物语", "くりこま高原": "栗驹高原", "四ツ谷": "四谷",
      "千葉みなと": "千叶港", "かみのやま温泉": "上山温泉", "あきた白神": "秋田白神",
      "特急ひだ": "特急飞驒", "特急ふじかわ": "特急富士川", "東田子の浦": "东田子之浦",
      "キハ11形": "Kiha11形", "特急サンダーバード": "特急雷鸟", "特急はまかぜ": "特急滨风",
      "マキノ": "牧野", "特急やくも（国鉄色リバイバル編成）": "特急八云（国铁色复古编组）",
      "特急まほろば号": "特急万叶号", "越前たけふ": "越前武生", "キハ189系": "Kiha189系",
      "おごと温泉": "雄琴温泉", "日本へそ公園": "日本肚脐公园", "特急しおかぜ": "特急潮风",
      "特急うずしお": "特急涡潮", "四国まんなか千年ものがたり": "四国正中千年物语",
      "伊予灘ものがたり": "伊予滩物语", "志国土佐　時代（トキ）の夜明けのものがたり": "志国土佐 时代（朱鹮）黎明物语",
      "しまんトロッコ": "四万十小火车", "キクハ32形": "Kikuha32形", "キハ32形": "Kiha32形",
      "特急ゆふいんの森": "特急由布院之森", "ハウステンボス": "豪斯登堡", "えびの": "虾野",
      "ふたつ星４０４７": "双星4047", "特急かわせみやませみ": "特急翡翠山翡翠",
      "子供の国": "儿童之国", "うきは": "浮羽", "いこいの村": "憩之村",
      "キハ183系": "Kiha183系", "キロシ47形": "Kiroshi47形", "キハ71形": "Kiha71形",
      "スペースワールド": "太空世界", "鉄道開業150年記念・秋乗りミッション！": "铁道开业150年纪念・秋季乘车任务！",
      "さらに楽しむ！秋乗りミッション": "更多乐趣！秋季乘车任务", "みどりの窓口": "绿色窗口",
      "切符切り": "检票", "ふえ": "哨子", "発車メロディリモコン": "发车旋律遥控器",
      "輸送コンテナ": "运输集装箱", "マルスM型端末": "MARS M型终端", "バラスト": "道砟",
      "転てつ器": "转辙器", "ブラシ式除雪装置": "刷式除雪装置", "排雪モータカー": "排雪轨道车",
      "レール探傷車": "钢轨探伤车", "マルチプルタイタンパー": "多联捣固机", "鉄道クレーン車": "铁道起重机",
      "フェリー": "渡轮", "人型重機ロボット": "人形重机机器人", "ドクターイエロー": "黄色医生",
      "リニア中央新幹線": "磁悬浮中央新干线", "マスコンハンドル": "主控制器手柄",
      "ブレーキハンドル": "制动手柄", "トラス鉄橋": "桁架铁桥",
      "比内地鶏の鶏めし": "比内地鸡鸡肉饭", "鶏めし弁当": "鸡肉饭便当",
      "津軽の弁当 お魚だらけ": "津轻便当 全是鱼", "牛肉どまん中": "牛肉正中",
      "海苔のりべん": "海苔紫菜便当", "ワインのめし": "葡萄酒饭", "えび千両ちらし": "虾千两散寿司",
      "さけめし": "鲑鱼饭", "鱈めし": "鳕鱼饭", "磯の漁火": "矶之渔火", "にしんめし": "鲱鱼饭",
      "だるま弁当": "达摩便当", "シウマイ弁当": "烧卖便当",
      "きざみ岩下の新生姜 きぶなカレー ブラックシーフード": "岩下嫩姜丝 木菜咖喱 黑海鲜",
      "田ヶ里公園": "田之里公园", "鰺ケ沢": "鲹之泽", "龍ケ崎市": "龙崎市", "市ケ谷": "市谷",
      "御茶ノ水": "御茶之水", "三ノ宮": "三之宫", "一ノ関": "一之关", "原ノ町": "原之町",
      "梅ヶ谷": "梅之谷", "五十鈴ヶ丘": "五十铃之丘", "鳩ノ巣": "鸠之巢", "羽ノ浦": "羽之浦",
      "虹ノ松原": "虹之松原", "吉野ヶ里公園": "吉野之里公园", "海ノ中道": "海之中道", "天ヶ瀬": "天之濑",
      "飛騨一ノ宮": "飞驒一之宫", "特急ニセコ": "特急二世谷", "湯ノ中道": "汤之中道",
      "南ケ谷": "南之谷", "田ノ浦": "田之浦", "関ヶ原": "关原"
    };
    // 形态后缀统一
    var base = name
      .replace(/駅（推し駅）/g, "站（推荐站）")
      .replace(/駅（冬）/g, "站（冬）")
      .replace(/駅（夏）/g, "站（夏）")
      .replace(/駅（春）/g, "站（春）")
      .replace(/駅（秋）/g, "站（秋）")
      .replace(/駅/g, "站")
      .replace(/（推し駅）/g, "（推荐站）");
    var core = base.replace(/(站（[^）]*）|站)$/, "");
    if (SUP[core]) {
      return SUP[core] + (core === base ? "" : base.slice(core.length));
    }
    var map = {
      "東室蘭": "东室兰", "岩見沢": "岩见泽", "苫小牧": "苫小牧", "旭川": "旭川", "稚内": "稚内", "函館": "函馆",
      "新函館北斗": "新函馆北斗", "森": "森", "厚岸": "厚岸", "釧路": "钏路", "千住": "千住", "池袋": "池袋",
      "恵比寿": "惠比寿", "御徒町": "御徒町", "蒲田": "蒲田", "桜木": "樱木", "藤原": "藤原", "国立": "国立",
      "甲府": "甲府", "大宮": "大宫", "宇都宮": "宇都宫", "高崎": "高崎", "長野": "长野", "草津": "草津",
      "いわき": "磐城", "盛岡": "盛冈", "青森": "青森", "角館": "角馆", "秋田": "秋田", "新潟": "新潟",
      "松本": "松本", "軽井沢": "轻井泽", "塩釜": "盐釜", "米沢": "米泽", "喜多方": "喜多方", "三島": "三岛",
      "静岡": "静冈", "掛川": "挂川", "浜松": "滨松", "名古屋": "名古屋", "熱田": "热田", "可児": "可儿",
      "伊勢市": "伊势市", "大阪": "大阪", "天王寺": "天王寺", "姫路": "姬路", "京都": "京都", "奈良": "奈良",
      "和歌山": "和歌山", "舞鶴": "舞鹤", "倉敷": "仓敷", "敦賀": "敦贺", "糸魚川": "糸鱼川", "福井": "福井",
      "広島": "广岛", "呉": "吴", "萩": "萩", "鳥取": "鸟取", "米子": "米子", "江津": "江津",
      "鳴門": "鸣门", "西条": "西条", "徳島": "德岛", "博多": "博多", "佐賀": "佐贺", "唐津": "唐津",
      "熊本": "熊本", "阿蘇": "阿苏", "別府": "别府", "由布院": "由布院", "鹿児島中央": "鹿儿岛中央", "指宿": "指宿",
      "倶知安": "俱知安", "美瑛": "美瑛", "帯広": "带广", "品川": "品川", "上野": "上野", "平塚": "平塚",
      "八王子": "八王子", "越後湯沢": "越后汤泽", "水戸": "水户", "前橋": "前桥", "銚子": "铫子", "仙台": "仙台",
      "山形": "山形", "一ノ関": "一之关", "男鹿": "男鹿", "岐阜": "岐阜", "郡山": "郡山", "久慈": "久慈",
      "明石": "明石", "尾道": "尾道", "今治": "今治", "白浜": "白滨", "彦根": "彦根", "高松": "高松",
      "高知": "高知", "松山": "松山", "宇和島": "宇和岛", "窪川": "洼川", "長崎": "长崎", "武雄温泉": "武雄温泉",
      "鳥栖": "鸟栖", "宮崎": "宫崎", "南郷": "南乡", "金沢": "金泽", "下呂": "下吕", "高山": "高山",
      "上越妙高": "上越妙高", "直江津": "直江津", "黒井": "黑井", "犀潟": "犀潟", "大館": "大馆", "新青森": "新青森",
      "小淵沢": "小渊泽", "東京": "东京", "横浜": "横滨", "札幌": "札幌", "富良野": "富良野", "新津": "新津",
      "津川": "津川", "三瀬谷": "三濑谷", "紀伊長島": "纪伊长岛", "尾鷲": "尾鹫", "熊野市": "熊野市",
      "宇都": "宇都", "豊橋": "丰桥", "飯田": "饭田", "新宮": "新宫", "阿波池田": "阿波池田", "大歩危": "大步危",
      "多度津": "多度津", "善通寺": "善通寺", "琴平": "琴平", "岡山": "冈山", "標茶": "标茶", "上野": "上野",
      "飛騨萩原": "飞驒萩原", "飛騨小坂": "飞驒小坂", "飛騨古川": "飞驒古川", "美濃太田": "美浓太田", "出雲市": "出云市",
      "伊予大洲": "伊予大洲", "八幡浜": "八幡滨", "下灘": "下滩", "岩見沢": "岩见泽", "水上": "水上",
      "富士宮": "富士宫", "市川大門": "市川大门", "徳島": "德岛", "稚内": "稚内", "青森": "青森",
      "金沢": "金泽", "由布院": "由布院", "久慈": "久慈", "新千歳空港": "新千岁机场", "新千岁空港": "新千岁机场",
      "奥津軽いまべつ": "奥津轻今别", "津軽いまべつ": "津轻今别", "いまべつ": "今别",
      "サロベツ": "佐吕别", "オホーツク": "鄂霍次克", "特急サロベツ": "特急佐吕别", "特急オホーツク": "特急鄂霍次克", "特急": "特急", "SL冬の湿原号": "SL冬季湿原号", "冬の湿原号": "冬季湿原号",
      "音威子府": "音威子府", "奥津軽": "奥津轻", "滝川": "泷川", "網走": "网走", "登別": "登别", "五稜郭": "五棱郭",
      "洞爺": "洞爷", "知床斜里": "知床斜里", "摩周": "摩周", "根室": "根室", "名寄": "名寄", "江別": "江别",
      "手稲": "手稻", "新札幌": "新札幌", "小樽": "小樽", "新夕張": "新夕张", "千歳": "千岁", "池田": "池田",
      "大沼公園": "大沼公园", "新得": "新得", "深川": "深川", "北見": "北见", "木古内": "木古内", "当別": "当别",
      "苫小牧": "苫小牧", "瀧川": "泷川", "札幌": "札幌", "富良野": "富良野", "滝川": "泷川", "根室": "根室"
    };
    // 日汉字兜底转换
    var kanji = { "滝": "泷", "渋": "涩", "峠": "岭", "桜": "樱", "浜": "滨", "沢": "泽", "島": "岛", "岡": "冈", "広": "广", "図": "图", "塩": "盐", "鉄": "铁", "橋": "桥", "畑": "畑", "辻": "辻", "榊": "榊", "咲": "咲", "峯": "峰", "嶽": "岳", "嵜": "崎", "辺": "边", "渕": "渊", "﨑": "崎", "祇": "祇", "醍": "醍", "蛭": "蛭", "惣": "惣", "藪": "薮", "込": "込", "尻": "尻", "頭": "头", "麓": "麓", "岩": "岩", "崎": "崎", "瀬": "濑" };
    var kanjiRe = /[滝渋峠桜浜沢島岡広図塩鉄橋畑辻榊咲峯嶽嵜辺渕﨑祇醍蛭惣藪込尻頭麓岩崎瀬]/g;
    var full = map[core];
    if (full) {
      return full + base.slice(core.length).replace(/^站/, "站");
    }
    var converted = base.replace(kanjiRe, function (c) { return kanji[c]; });
    return converted;
  }

  function initFind() {
    if (!document.querySelector(".find") && !document.body.classList.contains("page-find")) return;
    fetch("data/stations_cn.json").then(function (r) { return r.json(); }).then(function (list) {
      STATION_DATA = list;
      renderStationList();
    }).catch(function () {});
  }

  function renderStationList() {
    var map = document.querySelector(".find .google-map");
    if (!map) return;
    map.style.overflow = "auto";
    map.style.background = "#f2f6f0";
    // 分组
    var groups = {};
    STATION_DATA.forEach(function (s) {
      (groups[s.group] = groups[s.group] || []).push(s);
    });
    var html = '<div style="padding:12px 10px 20px;">';
    Object.keys(groups).forEach(function (g) {
      html += '<div style="margin:10px 0;"><div style="font-weight:700;color:#02af00;font-size:13px;padding:4px 2px;border-bottom:2px solid #02af00;">' + (GROUP_CN[g] || g) + "（" + groups[g].length + "站）</div><div style=\"display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;\">";
      groups[g].forEach(function (s) {
        var id = "st_" + s.id;
        var got = has(id);
        html += '<span class="station-chip' + (got ? " got" : "") + '" data-id="' + id + '" data-name="' + s.name + '" style="display:inline-flex;align-items:center;gap:4px;border:1px solid #ccc;border-radius:20px;padding:3px 10px;font-size:11px;background:' + (got ? "#02af00" : "#fff") + ';color:' + (got ? "#fff" : "#333") + ';cursor:pointer;' + (got ? "border-color:#02af00;" : "") + '">' +
          '<img src="assets/img/stamp/' + s.id + '--01.png" style="width:20px;height:20px;border-radius:50%;" alt="">' +
          stationLabel(s.name) + '</span>';
      });
      html += "</div></div>";
    });
    html += "</div>";
    map.innerHTML = html;
    map.querySelectorAll(".station-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var id = chip.getAttribute("data-id");
        if (has(id)) {
          remove(id);
          chip.style.background = "#fff"; chip.style.color = "#333"; chip.style.borderColor = "#ccc";
        } else {
          add(id);
          chip.style.background = "#02af00"; chip.style.color = "#fff"; chip.style.borderColor = "#02af00";
        }
        updateCount();
      });
    });
  }

  function updateCount() {
    var el = document.querySelector(".total-stamp_number span");
    if (el) el.textContent = String(count()).padStart(4, "0");
    var nums = document.querySelectorAll(".total-stamp_number");
    nums.forEach(function (n) { });
  }

  /* ---------- list 页：本地已收集 ---------- */
  function initList() {
    var target = null;
    // list 页空态区域
    document.querySelectorAll("p, .unit-empty, .is-empty").forEach(function (el) { });
    var empty = null;
    document.querySelectorAll("*").forEach(function (el) {
      if (el.children.length === 0 && /还没有收集任何印章/.test(el.textContent)) empty = el;
    });
    if (!empty) return;
    // 仅当有本地印章时替换
    if (count() === 0) return;
    var box = empty.closest("section, div, .unit") || empty.parentElement;
    if (box && box !== empty) {
      var list = document.createElement("div");
      list.style.cssText = "padding:10px;display:flex;flex-wrap:wrap;gap:8px;";
      list.innerHTML = "";
      box.insertBefore(list, empty);
      empty.style.display = "none";
      renderLocalList(list);
    }
  }

  function renderLocalList(box) {
    fetch("data/stations_cn.json").then(function (r) { return r.json(); }).then(function (stations) {
      var byId = {};
      stations.forEach(function (s) { byId[s.id] = s; });
      var html = "";
      Object.keys(STAMPS).forEach(function (k) {
        if (k.indexOf("st_") === 0) {
          var st = byId[k.slice(3)];
          if (st) {
            html += '<div style="display:flex;align-items:center;gap:8px;border:1px solid #eee;border-radius:10px;padding:6px 10px;background:#fff;">' +
              '<img src="assets/img/stamp/' + st.id + '--01.png" style="width:36px;height:36px;border-radius:50%;" alt="">' +
              '<div><div style="font-size:12px;font-weight:700;">' + stationLabel(st.name) + '</div><div style="font-size:10px;color:#999;">' + new Date(STAMPS[k].t).toLocaleDateString("zh-CN") + "</div></div></div>";
          }
        } else if (k.indexOf("ikimono_") === 0) {
          html += '<div style="display:flex;align-items:center;gap:8px;border:1px solid #eee;border-radius:10px;padding:6px 10px;background:#fff;"><div style="font-size:12px;font-weight:700;">生物图鉴 No.' + k.slice(8) + "</div></div>";
        }
      });
      box.innerHTML = html;
    }).catch(function () {});
  }

  /* ---------- save 页：本地选择 ---------- */
  function initSave() {
    if (!document.body.classList.contains("page-save")) return;
    var chips = document.querySelectorAll(".stamp-select li, .stamp-select .item, .c-stampSelect li");
    chips.forEach(function (c) {
      c.addEventListener("click", function () { c.classList.toggle("is-active"); });
    });
  }

  /* ---------- 文本本地化微调（移除登录相关的功能性措辞） ---------- */
  function initTexts() {
    var walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walk.nextNode()) nodes.push(walk.currentNode);
    nodes.forEach(function (n) {
      var t = n.nodeValue;
      if (t.indexOf("登录WEB应用后") >= 0) {
        n.nodeValue = t.replace(/登录WEB应用后/g, "打开本应用后");
      }
      if (t.indexOf("登录即可参与各类活动") >= 0) {
        n.nodeValue = t.replace(/登录即可参与各类活动/g, "参与各类活动");
      }
      if (t.indexOf("登录・注册请点击此处") >= 0) {
        n.nodeValue = t.replace(/登录・注册请点击此处/g, "直接开始体验请点击此处");
      }
    });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    initMenu();
    initModals();
    initLogin();
    initTexts();
    initFind();
    initList();
    initSave();
    updateCount();
    document.addEventListener("stampchange", function () { updateCount(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.TT = {
    hasStamp: has, addStamp: add, removeStamp: remove, countStamps: count, stationLabel: stationLabel
  };
})();
