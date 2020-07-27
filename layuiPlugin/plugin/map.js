layui.define(['jquery', 'colorpicker', 'layer', 'form'], function(exports) {

	"use strict";

	var MOD_NAME = 'map',
		$ = layui.jquery,
		colorpicker = layui.colorpicker,
		layer = layui.layer,
		form = layui.form,
		MAP_HEIGHT_RATIO = 1.148, //地图，坐标图高度比
		MAP_WIDTH_RATIO = 1.26, //地图坐标图宽度比
		DEFAULT_RESOURCE_NAME = "当前没有选择任何资源图层，请新建后开始绘画",
		SELECT_RESOURCE_HIT = "当前选择的资源图层是: ";

	var MAP_SIZE_GOAL = {
		"small": {
			width: "300px",
			height: "300px",
			topRatio:0.9648,
			leftRato:0.9523
		},
		"middle": {
			width: "600px",
			height: "600px",
			topRatio:0.9182,
			leftRato:0.873
		},
		"big": {
			width: "800px",
			height: "800px",
			topRatio:0.8971,
			leftRato:0.7968
		}
	}

	//自定义验证规则
	form.verify({
		checkResourceName: function(value) {
			if (value.length < 1) {
				return '资源名小于一个字符';
			}
			if (!isNaN(value)) {
				return '资源名不能为数字';
			}
		},
		checkAreaDesc: function(value) {
			//描述允许为空，但是不能超过200字
			if (value.length > 200) {
				return '描述长度不能超过200个字';
			}
		}
	});

	var map = function() {
		this.v = '1.3.0';
	};
	document.oncontextmenu = function() {
		return false
	} //禁止右键弹窗
	map.prototype.render = function(config) {

		// 配置地图的长宽，和容器所在位置，横纵坐标的总值
		//检查参数是否合理
		config.id = config.id || 'map';
		config.container = config.container || 'map-container';
		config.url = config.url || '';
		config.x = config.x || '90';
		config.y = config.y || '90';
		var MAP_MODE_EDIT = "edit",
			MAP_MODE_VIEW = "view",
			MAP_SIZE_MIDDLE = "middle",
			MAP_SIZE_SMALL = "small",
			MAP_SIZE_BIG = "big",
			MAP_MODE = MAP_MODE_EDIT, // view 预览模式，不可编辑 edit 编辑模式，表示可以绘画
			MAP_SIZE = MAP_SIZE_MIDDLE; //地图分为 small middle big 三个尺寸
		MAP_SIZE = config.size || MAP_SIZE;
		
		//接口数据的初始化
		// config.queryLayer=config.queryLayer||"",//查询图层的接口，该接口将会查询可以被添加的地图总览
		// config.saveLayer=config.saveLayer||"",//当用户点击保存按钮的时候，会保存改图层全部数据的接口
		// config.importLayer=config.importLayer||"",//将保存的数据导入的接口
		if (!check("queryLayer", config)) {
			throwEx("queryLayer 未定义")
		}
		if (!check("saveLayer", config)) {
			throwEx("saveLayer 未定义")
		}
		if (!check("importLayer", config)) {
			throwEx("importLayer 未定义")
		}
		//为地图注册初始化坐标系数，x和y表示为地图的最大路径，最后做换算
		var container = $(config.container);
		var side = MAP_SIZE_GOAL[MAP_SIZE];
		container.css({
			width: side.width,
			height: side.height
		});
		var containerWidth = container.width();
		var containerHeight = container.height();
		var containerLeft = container.offset().left;
		var containerTop = container.offset().top;
		// x 坐标比例
		var xRatio = computRatio(config.x, containerWidth, 6);
		var yRatio = computRatio(config.y, containerHeight, 6);
		var pointCount = 0;
		//创建一个随着鼠标移动的面板，用来计算坐标位置
		var id = config.id;

		mapFun(id);
		var bm = null; //图片初始化对象
		backgroundMap(); //背景图片添加
		resourceFormWindow(); //资源表单添加
		areaDescFormWindow(); //区域描述表单添加
		// bm.offset({
		// 	top: containerTop,
		// 	left: containerLeft
		// });
		var map = $(".container-map-" + id);
		//初始化map的位置
		map.offset({
			top: containerTop,
			left: containerLeft
		});
		var mapLeft = map.offset().left;
		var mapTop = map.offset().top;

		panelFun();

		canvas();
		// yPanel();
		// xPanel();

		pointMenu();
		resourceColors();
		// areaColors();

		var pointMenu = $("#map-point-menu");
		var cancelPointMenu = pointMenu.find("ul li:last-child"); //取消按钮
		var removePointMenu = pointMenu.find("ul li:first-child"); //删除按钮


		areaMenu();
		var areaMenu = $("#map-area-menu");
		var cancelAreaMenu = areaMenu.find("ul li:last-child"); //取消按钮
		var desAreaMenu = areaMenu.find("ul li").eq(1); //添加区域描述菜单
		var removeAreaMenu = areaMenu.find("ul li:first-child"); //删除按钮

		var openCross = config.cross;
		if (openCross) {
			cross();
		}
		var crossX = $(".map-cross-x");
		var crossY = $(".map-cross-y");
		crossY.css("top", "0px");
		//获取面板

		var panel = $(".coordinate-panel");
		// var yPanel = $(".coordinate-ypanel");
		// var xPanel = $(".coordinate-xpanel");
		var colors = $(".colors");
		//色块区域选择器
		currentSelectResourceShow();
		var currentSelectResourceShow = $(".currentSelectResourceShow");
		var colorPriority = colors.find(".color-priority");

		var canvas1 = document.getElementById("map-canvas");
		canvas1.width = containerWidth;
		canvas1.height = containerHeight;

		var canvas = $(canvas1);

		map.width(containerWidth);
		map.height(containerHeight);
		colors.width(containerWidth);
		var marginLeft = "margin-left";
		var marginTop = "margin-top"
		var panelWidth = panel.width();
		var panelHeight = panel.height();
		var panelLonKey = panel.find(".lon .key");
		var panelLatKey = panel.find(".lat .key");
		var panelLonValue = panel.find(".lon .value");
		var panelLatValue = panel.find(".lat .value");
		check("xName", config) ? panelLonKey.text(config.xName) : panelLonKey.text("lon:");
		check("yName", config) ? panelLonKey.text(config.yName) : panelLatKey.text("lat:");
		// xRulerPanel(); //初始化横坐标标尺
		// yRulerPanel(); //初始化纵坐标标尺
		operationPanel(); //初始化操作面板
		var operationPanel = $(".map-operation-panel");
		var newLayer = $("#newLayer"); //新建图层按钮
		var importLayer = $("#importLayer"); //导入图层按钮
		var closeDraw = $("#closeDraw"); //关闭绘画模式
		var addResourceButton = $("#add-resource-button");
		var addResourceWindow = $("#add-resource-window")
		//地区描述 
		var addAreaDescWindow = $("#add-area-desc-window");
		var addAreaDescWindowJs = document.getElementById("add-area-desc-window");
		//区域描述展示弹窗
		areaDescWindow();
		var tooltip = $(".tooltip");
		var tooltipImg = $(".area-desc-img");
		var tooltipName = $(".area-desc-label");
		var tooltipDesc = $(".area-desc-text");
		var tooltipClose = $(".area-desc-close");

		//选择新建图层弹出框
		layerInfoWindow();
		var layerInfoForm=$("#layer-info-form");
		var layerSelected=layerInfoForm.find("#layer-select");
		var layerInfoName = layerInfoForm.find("#layer-name");
		
			
		panel.hide(); //默认隐藏
		hideCross();

		//注册事件
		// registerAreaColorsEvent();
		pointMenuEventRegister();
		areaMenuEventRegister();
		registerCanvas();
		registerOperationPanelEvent();
		//展示区域详情页面的事件注册
		registerAreaDesc();

		/**
		 * 是否有图层
		 */
		function checkHasLayer(){
			return Object.getOwnPropertyNames(layerManager).length > 0;
		}

		//设置map的位置
		map.mouseenter(function(e) {
			if(checkHasLayer()){//有图层就显示
				panel.show(); //显示
				showCross();
			}
		});
		map.mouseleave(function(e) {
			panel.hide();
			hideCross();
		});

		var draw = false; //开启画图模式
		viewMode(); //默认预览模式
		//定义画线的对象

		var pts = {}; //所有点的信息存储，所有的内容将会被定义成区域的分组
		var areas = []; //所画地图区域的分组
		var areasCount = 0; //目前所画的区域是索引是多少
		var pen = { //初始化第一支画笔
			strokeStyle: '#006699',
			strokeWidth: 2,
			closed: false
		}

		map.mousedown(function(e) {
			if (draw) {
				clearCanvas();
				refreshPen();
				var coord = window2MapXY(e.pageX, e.pageY);
				addPoint(coord.x, coord.y, "#FF6666");
				drawPath();
			} else {
				isIn(e.pageX, e.pageY);
			}
		});

		function tooltipShow(){
			tooltip.slideDown("fast",function(){
				tooltip.show();
			});
		}
		
		function tooltopHide(){
			tooltip.slideUp("fast",function(){
				tooltip.hide();
			});
		}
		/**
		 * 切换到编辑模式
		 */
		function editMode() {
			MAP_MODE = MAP_MODE_EDIT;
			draw = true;
			//主要是点的显示
			regAreaPointsShow(currentSelectResourceName);
			closeDraw.text("编辑模式");
			layer.msg("切换到编辑模式");
		}

		function isView() {
			return MAP_MODE === MAP_MODE_VIEW;
		}

		/**
		 * 切换到预览模式
		 */
		function viewMode() {
			MAP_MODE = MAP_MODE_VIEW;
			draw = false;
			regAreaPointsHide(currentSelectResourceName);
			closeDraw.text("预览模式");
			layer.msg("切换到预览模式");
		}


		function currentResourceSetName(name) {
			if (name != null) {
				currentSelectResourceShow.text(SELECT_RESOURCE_HIT + name);
			} else {
				currentSelectResourceShow.text(DEFAULT_RESOURCE_NAME);
			}

		}

		/**
		 * 显示当前选择了什么
		 */
		function currentSelectResourceShow() {
			var csrs = "<div class=\"layui-badge layui-bg-cyan currentSelectResourceShow\">" + DEFAULT_RESOURCE_NAME +
				"</div>";
			colors.after(csrs);
		}

		/**判断 x 和 y是否在区域里面
		 * @param {Object} testX 等待测试的x坐标
		 * @param {Object} testY 等待测试的y坐标
		 * 
		 * Object.getOwnPropertyNames(MAP_COLOR["ice"].level).length
		 * 这里取巧，反向取值，原因在于高地势应该优先被点击
		 */
		function isIn(testX, testY) {
			var coord = window2MapXY(testX, testY);
			var px = parseInt(coord.x / xRatio);
			var py = parseInt(coord.y / yRatio);
			for (var point in areaPoints) {
				var data = areaPoints[point].data;
				if (pointInPolygon([px, py], data.area, data.nvert)) {
					// 取出映射的对象
					var mapping = colorMappingArea[point];
					// console.log(mapping);
					var desc = mapping.desc;
					areaDescVal(desc.areaName, desc.areaImg, desc.areaDesc);
					tooltipShow();
					tooltip.offset({
						left: testX + 30,
						top: testY - 100
					});
					break;
				}
			}
		}

		/**页面展示赋值
		 * @param {Object} areaName
		 * @param {Object} areaImg
		 * @param {Object} areaDesc
		 */
		function areaDescVal(areaName, areaImg, areaDesc) {
			tooltipImg.css({
				background: 'url(' + areaImg + ') no-repeat',
				backgroundSize: '100% 100%'
			})
			tooltipName.text(areaName || "暂无地域名称");
			tooltipDesc.text(areaDesc || "暂无地域描述");
		}

		function registerAreaDesc() {
			tooltipClose.click(function() {
				tooltopHide();
			});
		}

		/**
		 * 区域描述内容弹框
		 */
		function areaDescWindow() {
			var descWindow = "<div class=\"tooltip\" style=\"display:none;\">" +
				"<div class=\"area-desc-close\">x</div>" +
				"<div class=\"area-desc-img\">图片</div>" +
				"<div class=\"area-desc-content\">" +
				"<div class=\"area-desc-title\">" +
				"<label class=\"area-desc-label\">暂无区域名称</label>" +
				"</div>" +
				"<div class=\"area-desc-item\">" +
				"<label class=\"area-desc-text\">暂无区域描述</label>" +
				"</div>" +
				"</div>" +
				"</div>";
			$(document.body).append(descWindow);
		}

		function confirmWindow(title, hit, callback) {
			layer.open({
				type: 1,
				title: title,
				area: ['300px', '160px'],
				shade: 0.4,
				resize: false,
				content: "<div style=\'width:80%;margin:2% auto;text-align:center;\'>" + hit + "</div>",
				btn: ['确定', '取消'],
				yes: function() {
					callback();
					layer.closeAll();
				},
				btn2: function() {
					layer.closeAll();
				}
			});
		}

		// 功能：判断点是否在多边形内
		// 方法：求解通过该点的水平线与多边形各边的交点
		// 结论：单边交点为奇数，成立!

		// 参数：
		// POINT p 指定的某个点
		// LPPOINT ptPolygon 多边形的各个顶点坐标（首末点可以不一致）
		// int nCount 多边形定点的个数
		function max(arg1, arg2) {
			var a = parseFloat(arg1);
			var b = parseFloat(arg2);
			if (a > b) {
				return a;
			} else {
				return b;
			}
		}

		function min(arg1, arg2) {
			var a = parseFloat(arg1);
			var b = parseFloat(arg2);
			if (a < b) {
				return a;
			} else {
				return b;
			}
		}

		function pointInPolygon(p, area, nCount) {
			var nCross = 0;

			for (var i = 0; i < nCount; i++) {
				var p1 = area[i]; //当前节点
				var p2 = area[(i + 1) % nCount]; //下一个节点
				//这里其实是数据，表示xy的数组
				// 求解 y=p.y 与 p1p2 的交点

				if (p1[1] == p2[1]) {
					// p1p2 与 y=p0.y平行
					continue;
				}

				if (p[1] < min(p1[1], p2[1])) {
					// 交点在p1p2延长线上
					continue;
				}
				if (p[1] >= max(p1[1], p2[1])) {
					// 交点在p1p2延长线上
					continue;
				}

				// 从P发射一条水平射线 求交点的 X 坐标 ------原理: ((p2.y-p1.y)/(p2.x-p1.x))=((y-p1.y)/(x-p1.x))
				//直线k值相等 交点y=p.y
				var x = parseFloat(p[1] - p1[1]) * parseFloat(p2[0] - p1[0]) / parseFloat(p2[1] - p1[1]) + p1[0];

				if (x > p[0])
					nCross++; // 只统计单边交点
			}

			// 单边交点为偶数，点在多边形之外 ---
			return (nCross % 2 == 1);
		}



		/**
		 * @param {Object} area 等待被初始化的多边形的区域数组
		 */
		function initAreaData(area) {
			var arrX = [];
			var arrY = [];
			area.forEach(function(v1, i1, arr1) {
				arrX.push(v1[0]);
				arrY.push(v1[1]);
			});
			return {
				area: area,
				nvert: arrX.length,
				arrX: arrX,
				arrY: arrY,
				maxX: Math.max.apply(Math, arrX),
				minX: Math.min.apply(Math, arrX),
				maxY: Math.max.apply(Math, arrY),
				minY: Math.min.apply(Math, arrY)
			}
		}

		var areaRemove = false; //表示是否进行过删除操作，如果进行过删除操作，绘制的范围要减少	

		/**
		 * @param {Object} name
		 * 传入 area-1-金属-1
		 * 返回金属
		 */
		function getResourceName(name) {
			var v1 = name.substring(0, name.lastIndexOf("-"));
			return v1.substring(v1.lastIndexOf("-") + 1, v1.length);
		}

		function areaMenuEventRegister() {

			cancelAreaMenu.click(function(e) {
				areaMenu.hide();
				return false;
			});
			//添加区域描述
			desAreaMenu.click(function(e) {
				areaMenu.hide();
				layer.open({
					type: 1,
					title: '添加区域描述',
					area: ['20%', '60%'],
					shade: 0.4,
					resize: false,
					content: addAreaDescWindow
				});
				return false;
			});

			removeAreaMenu.click(function(e) {
				// 删除区域的逻辑，将之前区域的菜单点删除，然后将area中的 与 区域对应的索引点干掉
				// pts
				// areaRemove=true;
				clearCanvas();
				var key = removeAreaMenu.data("target");
				var areaObj = areaPoints[key].obj; //获得区域点
				var areaIndex = areaObj.data("area"); //删除完一个地方后，地区索引需要重新排序
				//删除元素
				areas.splice(areaIndex, 1);
				delete areaPoints[key];
				delete colorMappingArea[key];
				delete resourceManager[currentSelectResourceName].data[key];
				areaObj.remove(); //删除菜单点
				//获得当前点所在区域索引
				var i = 0;

				var tempArea = {}; //重新排序
				var tempMapping = {}; //映射关系重新排序	
				var tempData = {}; //资源色块的临时区域
				for (var area in areaPoints) {
					var d = areaPoints[area];
					var ap = d.obj;
					var resourceName = getResourceName(area);
					var k = "area-" + layerCount + "-" + resourceName + "-" + i;
					ap.attr("class", k);
					ap.data("area", i);
					tempArea[k] = {
						obj: ap,
						data: d.data,
					};
					//建立映射关系
					var mappingArea = colorMappingArea[area];
					var index = mappingArea.index;
					var md = mappingArea.data;
					tempMapping[k] = {
						index: index,
						data: md
					}
					//色块的重新排序
					if (tempData[resourceName] != null) {
						tempData[resourceName][k] = d.data.area;
					} else {
						tempData[resourceName] = {}
						tempData[resourceName][k] = d.data.area;
					}
					i++;
				}
				areaPoints = tempArea;
				colorMappingArea = tempMapping;
				for (var t in tempData) {
					resourceManager[t].data = tempData[t];
				}
				areaMenu.hide();
				areasCount--; //区域递减
				closeCount--; //可用封闭次数也减少
				fillPolygon(false, true);
			});

		}




		function registerCanvas() {
			canvas.click(function(e) {
				if (false) {
					// alert(e.pageX+" "+e.pageY);
				}
			});
		}






		function pointMenuEventRegister() {
			//注册取消菜单时间
			cancelPointMenu.click(function(e) {
				pointMenu.hide();
				return false;
			});
			//注册删除按钮
			removePointMenu.click(function(e) {
				clearCanvas();
				//删除点位，还有在他后面的所有点与连线
				var key = removePointMenu.data("target");
				// var i = 0;
				var isStart = false; //是否后面的所有连线开始正式删除
				for (var o in pts) {
					// i++;
					if (key === o || isStart) {
						isStart = true; //走一次
					} else {
						continue;
					}
					if (isStart) {
						pts[o].point.remove();
						delete pts[o];
						areas[areasCount].pop();
					}
				}
				pointMenu.hide();
				pointCount = parseInt(getPointPosition(key)); //总计数变为删除位置
				if (closeCount != null) {
					fillPolygon(false);
				}
				refreshPath();
			});
		}

		function refersh() {
			clearCanvas();
			// refreshPath();
			fillPolygon(false);
		}

		/**
		 * 获得在pts中的索引
		 * @param {Object} cn point的类名
		 */
		function getPointPosition(cn) {
			return parseInt(cn.substr(cn.lastIndexOf("-") + 1, cn.length - 1));
		}

		/**
		 * 获得在areas中的索引
		 * @param {Object} cn point的类名
		 */
		function getAreaPosition(cn) {
			return parseInt(cn.substr(cn.lastIndexOf("-") + 1, cn.length - 1));
		}

		/**获得一个key
		 * @param {Object} groupIndex
		 * @param {Object} pointIndex
		 */
		function getPointKey(areaIndex, pointIndex) {
			return "p-" + groupIndex + "-" + pointIndex;
		}

		function refreshPen() {
			//创建新的画笔
			pen = {
				strokeStyle: '#000',
				strokeWidth: 2,
				closed: false
			};
		}

		/**
		 * 
		 * 区域闭合
		 *
		 * @param {Object} e 被点击的点对象
		 */
		var closeCount = null; //代表已经完成的区域计数，保证绘画出来是已经形成闭合的区域
		function areaclose(e) {
			clearCanvas();
			//获取被点击的点的信息，在pts中找到
			pen.closed = true;
			/**
			 * 闭合需要重新设置 列表，将
			 */
			var position = getPointPosition(e.target.className);
			//重新构建区域数组
			var i = 0;
			for (var o in pts) {
				i++;
				pts[o].point.remove();
				delete pts[o];
				if (position > i) {
					areas[areasCount].shift();

					continue;
				} //还没到对应的点
			}
			var areaGroup = areas[areasCount];
			// 入库操作
			// mapDatabase[selectItemName].level[selectLevelName].data.push(areaGroup);
			var areaIndex = getAreaIndex();
			resourceManager[currentSelectResourceName].data[areaIndex] = areaGroup;
			// 上方的色块记录
			//建立映射关系
			colorMappingArea[areaIndex] = {
				index: {
					item: currentSelectResourceName //原来 selectItemName
					//level: selectLevelName
				},
				data: areaGroup,
				desc: { //添加区域描述
					areaName: "",
					areaImg: "",
					areaDesc: ""
				}
			}
			// //存储当前已经完成的区域,描边显示
			for (var p = 0, len = areaGroup.length - 1; p <= len; p++) {
				pen['x' + (p + 1)] = areaGroup[p][0];
				pen['y' + (p + 1)] = areaGroup[p][1];
			}
			if (closeCount == null) {
				closeCount = 0;
				fillPolygon(false);
			} else {
				fillPolygon(true); //绘制完整的
				closeCount++;
			}
			//为这个区域增加一个标志，表示需要对这个区域进行编辑，删除的操作
			areaPoint(areaGroup[0][0], areaGroup[0][1]);
			areasCount++; //该区域完成，递增为下一个区域
			//创建新的画笔
			refreshPen();
			pointCount = 0; //点计数从0开始
			// 填充已经成为区域的区域
			//重新将之前的画笔删除 等会再说
			// drawAll();
		}


		//存储区域的点完成后的菜单按钮

		var colorMappingArea = {}; //用于标识 颜色和区域的关系，item - { data:[],areaName: }
		var areaPoints = {};
		var timeout = null; //用于存储长按事件的计时器
		var size = 10;
		var size_1 = size / 2;
		var isAreaMove = false;

		function getAreaIndex(cn) {
			return cn == undefined ? "area-" + layerCount + "-" + currentSelectResourceName + "-" + areasCount : cn;
		}

		function areaPoint(x, y, d, cn, mapping) {
			var className = getAreaIndex(cn);
			var style = "background-color:#ffaa00;width:" + size + "px;height:" + size +
				"px;border-radius:10px;top:" + parseInt(y - size_1) + "px;left:" + parseInt(x - size_1) +
				"px;position:absolute;cursor:pointer;";
			var point = "<div class='" + className + "' style='" + style + "' ></div>";
			map.append(point);
			var areap = $("." + className);
			areap.data("area", getAreaPosition(className));
			areap.mousedown(function(e) { //注册事件
				if (3 == e.which) { //右键
					//弹出菜单，类似是否删除这个点
					areaMenu.show();
					areaMenu.offset({
						left: e.pageX,
						top: e.pageY
					});
					//缓存数据
					desAreaMenu.data("target", e.target.className);
					removeAreaMenu.data("target", e.target.className);
				} else if (1 == e.which) { //左键
				}

				return false;
			});
			areaPoints[className] = {
				obj: areap,
				data: d == undefined ? initAreaData(areas[closeCount]) : d
			};
		}

		/** 填充多边形
		 * @param {Object} flag 
		 * 由于当绘制完成时候，开始绘制下一个区域准备完成的时候，默认会画出上一个区域的内容，
		 * true 表示现在完成和已经完成的所有区域打印
		 * false 当前正在绘制的不要打压，打印之间已经完成的区域
		 * 
		 * resourceManager={
			 "金属":{
				 color:"#颜色",
				 data:{
					 areasCount:[]
				 }
			 }
		 }
		 */
		var canvas1Ctx = canvas1.getContext("2d");
		canvas1Ctx.lineWidth = 1; // 2个像素宽
		canvas1Ctx.globalAlpha = 0.7; //不透明度
		function fillPolygon(flag, remove) {
			var len = flag ? areas.length - 1 : closeCount;
			//只根据当前选择的内容,现在版本不设置线条颜色，线条颜色和本体颜色一样。
			var item = resourceManager[currentSelectResourceName]
			if (item != null) {
				var data = item.data;
				canvas1Ctx.fillStyle = item.color;
				canvas1Ctx.strokeStyle = item.color;
				for (var d in data) {
					var ploy = data[d];
					canvas1Ctx.beginPath();
					canvas1Ctx.moveTo(ploy[0][0], ploy[0][1]);
					for (var j = 1, lenj = ploy.length; j < lenj; j++) {
						canvas1Ctx.lineTo(ploy[j][0], ploy[j][1]);
					}
					canvas1Ctx.closePath();
					canvas1Ctx.fill();
					canvas1Ctx.stroke();
				}
			}
		}

		/**
		 * 刷新当前正在绘画的线条
		 */
		function refreshPath() {
			//更新画笔
			pen = {
				strokeStyle: '#000',
				strokeWidth: 2,
				closed: false
			};
			var cpts = areas[areasCount];
			for (var p = 0, len = cpts.length; p < len; p++) {
				pen['x' + (p + 1)] = cpts[p][0];
				pen['y' + (p + 1)] = cpts[p][1];
			}
			canvas.drawLine(pen);
		}


		function drawPath() {
			var cp = pts[currentPointCount()];
			if (areas[areasCount] == undefined) {
				areas[areasCount] = [];
			}
			areas[areasCount].push([cp.px, cp.py]);
			//从数据中把点添加到对象
			var cpts = areas[areasCount];
			for (var p = 0, len = cpts.length; p < len; p++) {
				pen['x' + (p + 1)] = cpts[p][0];
				pen['y' + (p + 1)] = cpts[p][1];
			}
			if (closeCount != null) {
				fillPolygon(false);
			}
			canvas.drawLine(pen);
		}

		map.mousemove(function(e) {
			var px = e.pageX;
			var py = e.pageY;
			direction.dir(px, py);
			changePositionValue(px, py);
			if (openCross) {
				changeCrossPosition(px, py);
			}
		});

		/**
		 * 判断方向的对象
		 */
		var direction = {
			lastX: 0,
			lastY: 0,
			dir: function(x, y) {
				var x1 = (x - containerLeft - (containerWidth / 2)) * (containerWidth > containerHeight ? (containerHeight /
					containerWidth) : 1);
				var y1 = (y - containerTop - (containerHeight / 2)) * (containerHeight > containerWidth ? (containerWidth /
					containerHeight) : 1);
				// 上(0) 右(1) 下(2) 左(3)  
				var direction = Math.round((((Math.atan2(y1, x1) * (180 / Math.PI)) + 180) / 90) + 3) % 4;
				if (0 === direction || 3 === direction) {
					panel.offset({
						top: y + 10,
						left: x + 10
					});
				} else {
					panel.offset({
						top: y - panelHeight - 10,
						left: x - panelWidth - 10
					});
				}
			}
		}

		function clearCanvas() {
			//去除所有的点
			canvas.clearCanvas();

		}

		function clearMap(flag) {
			canvas.clearCanvas();
			refreshPen();
			//去除所有代表区域的点
			if (flag) {
				for (var a in areaPoints) { //区域的点暂时不做删除，只是隐藏，在 initLayer 已经隐藏
					areaPoints[a].obj.hide();
				}
			} else {
				for (var a in areaPoints) { //区域的点暂时不做删除，只是隐藏，在 initLayer 已经隐藏
					areaPoints[a].obj.remove();
				}
			}

			areaPoints = {};
			for (var p in pts) {
				pts[p].point.remove();
			}
			pts = {}; //所有点的信息存储，所有的内容将会被定义成区域的分组
			areas = []; //所画地图区域的分组
			areasCount = 0; //目前所画的区域是索引是多少
			pointCount = 0;
			closeCount = null;
			resourceManager = {}; //新图层的色块
			colorMappingArea = {}; //新的映射区域
		}

		$(window).resize(function() {
			resizePosition();
		});

		function getPixelRatio(context) {
			var backingStore = context.backingStorePixelRatio ||
				context.webkitBackingStorePixelRatio ||
				context.mozBackingStorePixelRatio ||
				context.msBackingStorePixelRatio ||
				context.oBackingStorePixelRatio ||
				context.backingStorePixelRatio || 1;
			return (window.devicePixelRatio || 1) / backingStore;
		}

		function canvas() {
			var canvasPanel = "<canvas id='map-canvas' style='position:absolute'></canvas>";
			map.append(canvasPanel);
		}
		/**
		 * 绘画模式下，右键点的菜单
		 */
		function pointMenu() {
			var menu = "<div id='map-point-menu' style='display:none;' ><ul><li>删除</li><li>menu1</li><li>取消</li></ul></div>";
			$(document.body).append(menu);
		}
		/**
		 * 绘画模式下，右键点击的区域菜单
		 */
		function areaMenu() {
			var menu =
				"<div id='map-area-menu' style='display:none;' ><ul><li>删除此区域</li><li>为此区域添加描述</li><li>取消</li></ul></div>";
			$(document.body).append(menu);
		}

		function resizePosition() {
			containerLeft = container.offset().left;
			containerTop = container.offset().top;
			map.offset({
				left: containerLeft,
				top: containerTop
			});
			bm.offset({
				left: containerLeft * side.leftRato,
				top: containerTop * side.topRatio
			});
			mapLeft = map.offset().left;
			mapTop = map.offset().top;
		}

		function changeCrossPosition(x, y) {
			crossX.css("top", y - mapTop);
			crossY.css("left", x - mapLeft);
		}

		/**
		 *  十字标尺，鼠标悬停地图上将会有内容
		 */
		function cross() {
			var crossX = "<div class='map-cross-x' style='position: absolute;width:" + containerWidth +
				"px;height:1px;border-top:1px solid red;'></div>";
			var crossY = "<div class='map-cross-y' style='position: absolute;height:" + containerHeight +
				"px;width:1px;border-left:1px solid red;'></div>";
			map.append(crossX);
			map.append(crossY);
		}

		function showCross() {
			crossX.show();
			crossY.show();
		}

		function hideCross() {
			crossX.hide();
			crossY.hide();
		}

		/**改变面板的值
		 * @param {Object} lon
		 * @param {Object} lat
		 */
		function changePositionValue(px, py) {
			var position = window2MapXY(px, py);
			panelLonValue.text((parseInt(position.x) + 10).toFixed(2)); //方舟地图，坐标会短上10
			panelLatValue.text(position.y);
		}

		function window2MapXY(px, py) {
			return {
				x: Math.round((parseInt(px - containerLeft) * xRatio)).toFixed(2),
				y: Math.round((parseInt(py - containerTop) * yRatio)).toFixed(2)
			}
		}

		function mapFun(id) {
			var map = "<div class='container-map-" + id + "'></div>";
			container.after(map);
		}

		/**
		 * 资源描述的表单
		 */
		function areaDescFormWindow() {
			var fromWindow =
				"<form class=\"layui-form layui-form-pane\" lay-filter=\"area-desc-form\" id=\"add-area-desc-window\" action=\"\" style=\"display: none;\">" +
				"<div class=\"layui-form-item\" style=\"width: 80%;margin: 5% auto;\">" +
				"<label class=\"layui-form-label\">区域名称</label>" +
				"<div class=\"layui-input-block\">" +
				"<input type=\"text\" name=\"areaName\" lay-verify=\"required\" placeholder=\"区域名称\" class=\"layui-input\">" +
				"</div>" +
				"</div>" +
				"<div class=\"layui-form-item\" style=\"width: 80%;margin: 5% auto;\">" +
				"<label class=\"layui-form-label\">区域图片</label>" +
				"<div class=\"layui-input-block\">" +
				"<input type=\"text\" name=\"areaImg\"  placeholder=\"区域图片\" class=\"layui-input\">" +
				"</div>" +
				"</div>" +
				"<div class=\"layui-form-item layui-form-text\" style=\"width: 80%;margin: 5% auto;\">" +
				"<label class=\"layui-form-label\">区域描述</label>" +
				"<div class=\"layui-input-block\">" +
				"<textarea placeholder=\"请输入区域描述\" lay-verify=\"checkAreaDesc\" style=\"min-height: 260px;\" name=\"areaDesc\" class=\"layui-textarea\"></textarea>" +
				"</div>" +
				"</div>" +
				"<div class=\"layui-form-item\" style=\"width: 80%;margin: 5% auto;\">" +
				"<div class=\"layui-input-block\">" +
				"<button type=\"submit\" class=\"layui-btn layui-btn-sm\" lay-submit=\"\" lay-filter=\"resource-desc-submit\">添加</button>" +
				"<button type=\"reset\" class=\"layui-btn layui-btn-sm layui-btn-normal\" id=\"form-desc-cancel\">取消</button>" +
				"</div>" +
				"</div>" +
				"</form>";
			container.append(fromWindow);
			var cancel = $("#form-desc-cancel");
			cancel.click(function(e) {
				layer.closeAll();
			});
			//监听提交
			form.on('submit(resource-desc-submit)', function(data) {
				var key = desAreaMenu.data("target");
				colorMappingArea[key].desc = data.field;
				layer.closeAll();
				addAreaDescWindowJs.reset();
				layer.msg("区域描述添加成功。");
				return false;
			});
		}

		/**
		 * 资源管理器，所有的地图由该表单进行创建，并统一添加到这里管理。
		 * 对象的索引键为改资源的名字，下方记录该资源的具体数据，通过切换上方资源名，进行切换
		 * 
		 * resourceManager={
			 "金属":{
				 color:"#颜色",
				 data:{
					 areasCount:[]
				 }
			 }
		 }
		
		 */
		var resourceManager = {};
		/**
		 * 用来资源图层下面的html元素
		 *  以图层为key区分,存储不同的html jquery对象
		 * resourceItems={
				layerIndex:{
					金属:"jquery对象"
				}	
					
			}
		 */
		var resourceItems = {};
		var currentSelectResourceName = ""; //当前选中的资源名
		function resourceFormWindow() {
			var fromWindow =
				"<form class=\"layui-form layui-form-pane\" lay-filter id=\"add-resource-window\" action=\"\" style=\"display: none;\">" +
				"<div class=\"layui-form-item\" style=\"width: 80%;margin: 5% auto;\">" +
				"<label class=\"layui-form-label\">资源名称</label>" +
				"<div class=\"layui-input-block\">" +
				"<input type=\"text\" name=\"resourceName\" lay-verify=\"checkResourceName\" placeholder=\"资源名称\" class=\"layui-input\">" +
				"</div>" +
				"</div>" +
				"<div class=\"layui-form-item\" style=\"width: 80%;margin: 5% auto;\">" +
				"<label class=\"layui-form-label\">资源颜色</label>" +
				"<div class=\"layui-input-block\">" +
				"<div class=\"layui-input-inline\" style=\"width: 70%; margin: 0;\" >" +
				"<input type=\"text\" name=\"resourceColor\" value=\"\" lay-verify=\"required\" placeholder=\"请选择颜色\" class=\"layui-input\" id=\"test-form-input\">" +
				"</div>" +
				"<div class=\"layui-inline\" style=\"margin: 0;\">" +
				"<div id=\"resource-color-form\" style=\"margin: 0;left: -1px;\"></div>" +
				"</div>" +
				"</div>" +
				"</div>" +
				"<div class=\"layui-form-item\">" +
				"<div class=\"layui-input-block\">" +
				"<button type=\"submit\" class=\"layui-btn layui-btn-sm\" lay-submit=\"\" lay-filter=\"resource-submit\">添加</button>" +
				"<button type=\"reset\" class=\"layui-btn layui-btn-sm layui-btn-normal\" id=\"form-cancel\">取消</button>" +
				"</div>" +
				"</div>" +
				"</form>";
			container.append(fromWindow);
			colorpicker.render({
				elem: '#resource-color-form',
				color: '#1c97f5',
				done: function(color) {
					$('#test-form-input').val(color);
				}
			});
			var cancel = $("#form-cancel");
			cancel.click(function(e) {
				layer.closeAll();
			});
			//监听提交
			form.on('submit(resource-submit)', function(data) {
				var field = data.field;
				var resourceColor = field.resourceColor;
				if (typeof(resourceManager[field.resourceName]) != "undefined") {
					layer.msg('资源名重复，请另外填写一个资源名。');
					return false;
				}
				//判断是否命名重复,这里是看看是否需要隐藏
				if (resourceManager[currentSelectResourceName] != undefined) {
					var lastData = resourceManager[currentSelectResourceName].data;
					//将上一次的图层点div给隐藏
					for (var p in lastData) {
						areaPoints[p].obj.hide();
					}
				}
				currentSelectResourceName = field.resourceName;
				currentResourceSetName(currentSelectResourceName);
				registerResourcesPanel(currentSelectResourceName, resourceColor);
				//图层的添加
				editMode();
				addResorceLayer(currentSelectResourceName, resourceColor); //添加资源图层到Resource
				layer.closeAll();
				cancel.click();
				refersh();
				return false;
			});
		}

		/**
		 * 注册资源管理面板的事件
		 * @param {Object} resourceName
		 * @param {Object} resourceColor
		 */
		function registerResourcesPanel(resourceName, resourceColor) {
			//同步到当前图层的管理器上
			layerManager[currentLayerName].currentSelectResourceName = currentSelectResourceName;
			colors.append(resourceContent(resourceName, resourceColor));
			var resourceItem = $("." + RESOURCE_CONTENT + resourceCount)
			//图层索引作为基础
			/**
			 * 应该拿到当前面板的索引
			 * 
			 */
			if (resourceItems[currentLayerName] == null) {
				resourceItems[currentLayerName] = {}; //第一段初始化
			}
			//接着第二段
			resourceItems[currentLayerName][resourceName] = resourceItem;
			$("." + RESOURCE_CLOSE + resourceCount).click(function(e) {
				confirmWindow('删除资源图层', '该操作将会清空此资源图层下的所有作图，是否继续?', function() {
					//清空改资源图层的操作,需要索引当前列表中是否还要空余的列表，有的话，自动选择，否则不选择
					var rn = $(e.target).data(RESOURCE_NAME);
					var layerName = $(e.target).data(RESOURCE_LAYER);

					resourceItems[layerName][rn][0].remove(); //
					delete resourceItems[layerName][rn];
					var removeData = resourceManager[rn].data;
					//对基础areaPoints进行删除，removeData 的 key含有映射区域和areaPoint的值
					/**
					 * areaPoints[className] = {
								obj: areap,
								data: d == undefined ? initAreaData(areas[closeCount]) : d
							};
					 */
					for (var key in removeData) {
						//如果存在于areaPoints 则删除
						var ap = areaPoints[key];
						if (ap != null) {
							ap.obj.remove();
							delete areaPoints[key];
						}
						//如果存在于colorMappingArea 则删除
						var cma = colorMappingArea[key];
						if (cma != null) {
							delete colorMappingArea[key];
						}
					}
					delete resourceManager[rn]; //删除这个库的所有的内容
					//判断是否列表里是否已经还有多余的内容
					if (Object.getOwnPropertyNames(resourceItems[layerName]).length <= 0) {
						viewMode();
					}
					if (Object.getOwnPropertyNames(resourceManager).length <= 0) {
						//没有资源图层，则将当前名字设置设置为空
						currentSelectResourceName = "";
						//由于没有资源图层，将该图层的目标选择设置为空
						layerManager[layerName].currentSelectResourceName = "";
						currentResourceSetName(null);
					} else {
						//说明存在内容，进行切换
						for (var r in resourceManager) {
							currentSelectResourceName = r;
							//选择第一个直接跳出
							break;
						}
						currentResourceSetName(currentSelectResourceName);
						regAreaPointsShow(currentSelectResourceName);
					}
					refersh();
					// delete resourceManager

				})
				return false;
			});
			//注册点击资源本体进行展示内容的切换
			var resrouceColor = $("." + RESOURCE_COLOR + resourceCount);
			resrouceColor.click(function(e) {
				//图层的切换
				//隐藏上一次的区域点显示
				var lastData = resourceManager[currentSelectResourceName].data;
				//将上一次的图层点div给隐藏
				for (var p in lastData) {
					areaPoints[p].obj.hide();
				}
				currentSelectResourceName = $(e.target).data(RESOURCE_NAME);
				currentResourceSetName(currentSelectResourceName);
				if (typeof(currentSelectResourceName) != "undefined") {
					var currData = resourceManager[currentSelectResourceName].data;
					//将这一次点击的给显示出来
					for (var c in currData) {
						areaPoints[c].obj.show();
					}
					refersh();
				}
				return false;
			});
			resourceCount++; //序列递增
		}

		/**
		 * 匹配对应的资源点进行显示
		 * @param {Object} resourceName
		 */
		function regAreaPointsShow(resourceName) {
			var reg = new RegExp(resourceName, "i");
			for (var a in areaPoints) {
				if (reg.test(a)) {
					areaPoints[a].obj.show();
				}
			}
		}
		/**
		 * 匹配对应的资源点进行删除
		 * @param {Object} resourceName
		 */
		function regAreaPointsHide(resourceName) {
			var reg = new RegExp(resourceName, "i");
			for (var a in areaPoints) {
				if (reg.test(a)) {
					areaPoints[a].obj.hide();
				}
			}
		}

		function addResorceLayer(resourceName, resourceColor) {
			resourceManager[resourceName] = {
				color: resourceColor,
				data: {}
			}
		}

		var resourceCount = 0, //区别每个资源的定位，并没有什么实际的意义，只是方便用来注册事件
			RESOURCE_CONTENT = "resource-content-",
			RESOURCE_CLOSE = "resource-close-",
			RESOURCE_COLOR = "resource-color-",
			RESOURCE_COUNT = "count",
			RESOURCE_NAME = "name",
			RESOURCE_LAYER = "layer";

		function getResourceContent(document_) {
			var count = $(document_).data(RESOURCE_COUNT);
			return colors.find("." + RESOURCE_CONTENT + count);
		}

		function getResourceClose(document_) {
			var count = $(document_).data(RESOURCE_COUNT);
			return colors.find("." + RESOURCE_CLOSE + count);
		}

		function getResourceColor(document_) {
			var count = $(document_).data(RESOURCE_COUNT);
			return colors.find("." + RESOURCE_COLOR + count);
		}

		function resourceContent(resourceName, resourceColor) {
			return "<div class=\"" + RESOURCE_CONTENT + resourceCount + "\" ><span class=\"resource-name\" title=\"" +
				resourceName + "\">" + resourceName + "</span><div data-count=\"" + resourceCount + "\" data-name=\"" +
				resourceName + "\" class=\"" + RESOURCE_COLOR + resourceCount + "\" style=\"background-color:" + resourceColor +
				";\"><div class=\"" + RESOURCE_CLOSE + resourceCount + "\" data-name=\"" + resourceName + "\" data-layer=\"" +
				currentLayerName + "\"  data-count=\"" + resourceCount +
				"\">x</div></div></div>";
		}

		/**
		 * 背景图片
		 */
		function backgroundMap() {
			var mapImage = "<div class='map-image' ></div>";
			container.after(mapImage);
			bm = $(".map-image");
			bm.css({
				position: 'absolute',
				width: containerWidth * MAP_WIDTH_RATIO,
				height: containerHeight * MAP_HEIGHT_RATIO,
				backgroundColor:"#dedede"
			})
			bm.offset({
				left: containerLeft * side.leftRato,
				top: containerTop * side.topRatio
			});

		}

		/**
		 * @param {Object} c 生成一个面板，用来显示地图坐标
		 */
		function panelFun() {
			var panel =
				"<div class='coordinate-panel'><div class='lon'><label class='key'></label><label class='value'></label></div><div class='lat'><label class='key'></label><label class='value'></label></div></div>"
			container.append(panel);
		}

		/**
		 *  生成 x 的标签图
		 */
		function xPanel() {
			var xPanel = "<div class='coordinate-xpanel'></div>";
			container.append(xPanel);
		}

		/**
		 * areaColors 
		 * 区域颜色面板
		 */
		var selectItem = null;
		var selectColor = null;
		/**
		 * 新的底层存储地区类别，和高低位的数据库
		 * 原先内容.
		 * 数据库的初始化
		 */
		/**
		 * 资源色块区域
		 */
		function resourceColors() {
			var colors = "<div class='colors'></div>";
			container.append(colors);

		}

		function xRulerPanel() {
			/**
			 * 标签和尺度将会为下面的xPanel标记上具体的值
			 */
			var xRule = "<label class='ruler-x-height'></label>" //横坐标的标尺
			var vxRule = "<span></span>"; //横坐标的标尺数值
			// 重点在于要 append 多少个,我们默认，初始化十个label和十个span到标尺里去，中间间隔一比例换算成标尺
			var pix = config.x / 8;
			var marLeft = parseInt(containerWidth / 8);
			for (var i = 1, length = 8; i <= length; i++) {
				//标尺的初始化
				var v = parseInt(pix * i);
				var xRule = "<label class='ruler-x-high' style='margin-left: " + parseInt((marLeft * i) + (0.7 * i)) +
					"px' ></label>";
				// top 为 标尺高度，默认css为10px
				var vxRule = "<span class='ruler-x-high-value' style='margin-left: " + parseInt((marLeft * i) - 12) +
					"px;margin-top:9px' >" + (v + 10) + "</span>"
				xPanel.append(xRule);
				xPanel.append(vxRule);
			}
			/**
			 * 方舟的x轴是从10开始，而不是0，所以总长度少一点
			 */
			/**
			 * 标尺和标尺数值不一定一一对应，标尺可能
			 */

		}

		function yRulerPanel() {
			/**
			 * 标签和尺度将会为下面的xPanel标记上具体的值
			 */
			var yRule = "<label class='ruler-y-height'></label>" //横坐标的标尺
			var vyRule = "<span></span>"; //横坐标的标尺数值
			// 重点在于要 append 多少个,我们默认，初始化十个label和十个span到标尺里去，中间间隔一比例换算成标尺
			var pix = config.y / 9;
			var marTop = parseInt(containerHeight / 9);
			for (var i = 1, length = 9; i <= length; i++) {
				//标尺的初始化
				var v = parseInt(pix * i);
				var yRule = "<label class='ruler-y-high' style='margin-top: " + parseInt((marTop * i) + (0.6 * i)) +
					"px' ></label>";
				// top 为 标尺高度，默认css为10px
				var vyRule = "<span class='ruler-y-high-value' style='margin-top: " + parseInt((marTop * i) - (i * 2)) +
					"px;margin-left:2px' >" + v + "</span>"
				yPanel.append(yRule);
				yPanel.append(vyRule);
			}

		}

		/**
		 * 生成右侧的操作面板
		 */
		function operationPanel() {
			var operation =
				"<div class='map-operation-panel layui-card'><div class=\"layui-card-header\">操作面板<div class=\"layui-btn-group\" style=\"margin-left: 10px;\"><button class=\"layui-btn layui-btn-sm\" id='newLayer'>新建图层</button><button class=\"layui-btn layui-btn-sm\" id='importLayer'>导入图层</button></div></div>" +
				"<div class=\"layui-card-body\">"+
				"<button class=\"layui-btn layui-btn-sm\" id='closeDraw'>关闭绘画模式</button>" +
				"<button id=\"add-resource-button\"  style=\"display:none;\" class=\"layui-btn layui-btn-sm add-resource-button\">添加资源图层</button></div></div>";
			container.append(operation);
		}

		var layerCount = 0; //累计图层数目
		var layerManager = {};
		var currentLayerName = "";
		var currentLayer = null;

		function addLayer(input,img) {
			draw = false; //每次新建图层的时候，都设置为false，因为这个时候没有资源图层，不能添加
			// viewMode();
			var layerPanel = layerPanelName();
			currentLayerName = layerPanelName();
			var layerCancel = layerCancelName();
			var layerSave = layerPanelSave();
			var layer = "<div class='" + layerPanel + "'>" + input + "<font id='" + layerCancel +
				"' >x</font><br/><font class='" + layerSave + "' '>导出(保存)</font></div>";
			operationPanel.append(layer);
			var cancel = $("#" + layerCancel);
			var panel = $("." + layerPanel);
			var save = $("." + layerSave);
			cancel.data("count", layerPanel);
			save.data("count", layerPanel);
			//第一次可能会存在初始化的问题
			var lastLayer = select(panel);
			if (lastLayer) {
				//且将切换上一个的图层的东西给隐藏掉,且保存已经初始化好的三个主要的内容
				initLayer(lastLayer["0"].className);
			}

			cancel.click(function(e) {
				//位于这一图层的所有信息都会被删除
				if (!isView()) {
					confirmWindow('删除图层', '你确定要删除这个图层，删除后，此图层上的所有作图都会被清空?', function() {
						//do something
						var layKey = cancel.data("count");
						var removeAreaPoints = layerManager[layKey].areaPoints;
						for (var re in removeAreaPoints) {
							removeAreaPoints[re].obj.remove();
						}
						//删除资源图层显示
						var rt = resourceItems[layKey];
						for (var r in rt) { //色块的删除
							$(rt[r][0]).remove();
						}
						//将对应区域对象删除掉
						delete layerManager[layKey];
						panel.remove();
						cancel.remove();
						save.remove();
						//自动选取位于最顶部的一个图层

						if (Object.getOwnPropertyNames(layerManager).length <= 0) {
							viewMode();
							addResourceButton.hide();
							currentResourceSetName(null);
							switchMap("");//设置为空白底部
							clearMap(true);
							currentLayer = null;
						} else {
							selectFirst();
							//判断当前是否有图层，没图层，关闭绘画模式，有则自动选择第一个图层
						}
					});
				}else{
					confirmWindow('删除图层', '当前处于预览模式，无法删除图层',function(){});
				}
				return false;
			});
			panel.click(function(e) {
				var lastClassName = select($(e.target))["0"].className;
				// currentLayerName = lastClassName;
				currentLayerName = e.target.className;
				//且将切换上一个的图层的东西给隐藏掉,且保存已经初始化好的三个主要的内容
				initLayer(lastClassName);
				//以上为存储上一个图层的信息，下面是初始化当前被点击图层的信息
				areas = layerManager[e.target.className].areas; //将当前存储的这个模板下的点区域复制回去
				areasCount = layerManager[e.target.className].areasCount; //还原当前区域编号
				areaPoints = layerManager[e.target.className].areaPoints; // 保存了当前图层可编辑地图的点
				closeCount = layerManager[e.target.className].closeCount;
				// mapDatabase = layerManager[e.target.className].mapDatabase;
				colorMappingArea = layerManager[e.target.className].colorMappingArea;
				resourceManager = layerManager[e.target.className].resourceManager //资源色块保存
				currentSelectResourceName = layerManager[e.target.className].currentSelectResourceName;
				layerMapKey=layerManager[e.target.className].layerMapKey;
				layerMapName=layerManager[e.target.className].layerMapName;
				layerMapImg = layerManager[e.target.className].layerMapImg;
				//切换地图
				switchMap(layerMapImg);
				//将匹配的点显示出来
				regAreaPointsShow(currentSelectResourceName);
				currentResourceSetName(currentSelectResourceName === "" ? null : currentSelectResourceName);
				//从之前保存的资源模块中初始化内容,当外部数据导入的时候也会初始化好资源图层内容
				var layerResourceItem = resourceItems[e.target.className];
				for (var item in layerResourceItem) {
					layerResourceItem[item].show();
				}
				refersh();
				return false;
			});
			save.click(function(e) {
				if (window.confirm("此操作，将会把该图层的数据导出为文本，你确定吗?")) {
					//切换回这个图层
					panel.click();
					var layKey = save.data("count");
					var layer = layerManager[layKey];
					//保存区域点的数据，标点对象忽略，设置为空
					var ap = layer.areaPoints;
					var temp = {};
					for (var className in ap) {
						temp[className] = ap[className].data;
					}
					var saveData = {
						ac: layer.areasCount,
						cc: layer.closeCount,
						as: layer.areas,
						ap: temp,
						ma: layer.colorMappingArea,
						rm: layer.resourceManager,
						mk:	layer.layerMapKey,
						mn: layer.layerMapName,
						mi: layer.layerMapImg
					}
					// console.log(JSON.stringify(saveData))
					exportRaw("data.json", JSON.stringify(saveData));
				}
				return false;
			});
			clearMap(true); //清空内容
			//每次新创建的时候会复制
			layerManager[layerPanel] = {
				layerPanel: panel,
				layerCancel: cancel,
				layerSave: save,
				areasCount: areasCount,
				areas: areas,
				areaPoints: areaPoints,
				closeCount: closeCount,
				colorMappingArea: colorMappingArea,
				resourceManager: resourceManager, //资源色块保存
				currentSelectResourceName: "" ,//那个时候选择的色块名，方便区域点的指定显示，而不是
				layerMapKey:layerMapKey,
				layerMapName:layerMapName,
				layerMapImg:layerMapImg
			}
			currentResourceSetName(null);
			layerCount++;
		}

		function importData(data, input) {
			//解析
			var d = JSON.parse(data);
			if (typeof(d) == undefined) {
				alert("数据解析错误");
			} else {
				layerMapImg = d.mi;
				layerMapKey = d.mk;
				layerMapName = d.mn;
				addLayer(input); //第二个为默认输入框内容
				areasCount = d.ac;
				closeCount = d.cc;
				areas = d.as;
				var needP = d.ap;
				colorMappingArea = d.ma;
				resourceManager = d.rm;
				switchMap(layerMapImg);
				//选择第一个资源图层为选中状态
				for (var resource in resourceManager) {
					registerResourcesPanel(resource, resourceManager[resource].color);
					currentSelectResourceName = resource;
				}
				var i = 0;
				for (var p in needP) {
					areaPoint(areas[i][0][0], areas[i][0][1], needP[p], p, colorMappingArea[p]);
					i++;
				}
				//先把所有代表区域的点隐藏
				for (var p in areaPoints) {
					areaPoints[p].obj.hide();
				}
				regAreaPointsShow(currentSelectResourceName);
				editMode();
				addResourceButton.show(); //开启资源添加内容
				fillPolygon(false);
			}

		}

		function exportRaw(name, data) {
			var urlObject = window.URL || window.webkitURL || window;
			var export_blob = new Blob([data]);
			var save_link = document.createElementNS("http://www.w3.org/1999/xhtml", "a")
			save_link.href = urlObject.createObjectURL(export_blob);
			save_link.download = name;
			fakeClick(save_link);
		}

		function fakeClick(obj) {
			var ev = document.createEvent("MouseEvents");
			ev.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
			obj.dispatchEvent(ev);
		}

		/** 保存上一个模板的内容
		 * @param {Object} lastClassName 上一个模板的内容
		 */
		function initLayer(lastClassName) {
			for (var a in areaPoints) {
				areaPoints[a].obj.hide();
			}
			var layerResrouceItem = resourceItems[lastClassName];
			for (var item in layerResrouceItem) {
				$(layerResrouceItem[item][0]).hide();
			}
			//上一次的资源色块隐藏
			layerManager[lastClassName].areas = areas;
			layerManager[lastClassName].areasCount = areasCount;
			layerManager[lastClassName].areaPoints = areaPoints;
			layerManager[lastClassName].closeCount = closeCount;
			layerManager[lastClassName].colorMappingArea = colorMappingArea;
			layerManager[lastClassName].resourceManager = resourceManager;
		}

		function selectFirst() {
			for (var o in layerManager) {
				var obj = layerManager[o];
				select(obj.layerPanel);
				//并且赋值回去
				var rt = resourceItems[o];
				for (var r in rt) {
					$(rt[r][0]).show();
				}
				obj.areas = areas;
				areasCount = obj.areasCount;;
				areaPoints = obj.areaPoints;
				// for (var a in areaPoints) {
				// 	areaPoints[a].obj.show();
				// }
				closeCount = obj.closeCount;
				colorMappingArea = obj.colorMappingArea;
				resourceManager = obj.resourceManager;
				layerMapImg = obj.layerMapImg;
				layerMapKey = obj.layerMapKey;
				layerMapName = obj.layerMapName;
				switchMap(layerMapImg);
				for (var r in resourceManager) {
					currentSelectResourceName = r;
					regAreaPointsShow(r);
					currentResourceSetName(currentSelectResourceName);
					break;
				}
				refersh();
				return;
			}
		}

		/**
		 * @param {Object} e希望被选中的面板jquery对象
		 * 返回上一个被选中的对象
		 */
		function select(e) {
			unSelect();
			var returnLastLayer = currentLayer;
			currentLayer = e;
			currentLayerName = e[0].className;
			e.css({
				"border-color":"#1E9FFF"
			});
			return returnLastLayer;
		}

		function unSelect() {
			if (currentLayer) {
				currentLayer.css({
					"border-color":"#dedede"
				});
			}
		}

		function layerCancelName() {
			return "layer-cancel-" + layerCount;
		}

		function layerPanelName() {
			return "layer-" + layerCount;
		}

		function layerPanelSave() {
			return "layer-save-" + layerCount;
		}

		var switchFlag = false;

		function registerOperationPanelEvent() {
			operationPanel.width("250px");
			operationPanel.height(containerHeight);
			operationPanel.css({
				"margin-left": container.width() + 155
			});
			newLayer.click(function(e) {
				//根据选择的url路径，进行请求
				reqLayerInfo(config.queryLayer);
			});
			importLayer.click(function(e) {
				var data = window.prompt("请粘贴导出图层的数据", "");
				if (data) {
					//资源图层开启才开启绘画模式
					// draw = true;
					importData(data, "新建图层-" + layerCount);
				}
			});
			addResourceButton.click(function(e) {
				layer.open({
					type: 1,
					title: '添加',
					content: addResourceWindow,
					area: ['300px', '230px'],
					btnAlign: 'c' //按钮居中
						,
					shade: 0.4 //不显示遮罩
				});
				return false;
			});
			closeDraw.click(function(e) {
				if (switchFlag) {
					editMode();
					switchFlag = !switchFlag;
				} else {
					//还没初始化的开启绘画模式，通过删除手段将items删除的判断
					if (Object.getOwnPropertyNames(resourceItems).length < 1 ||
						resourceItems[currentLayerName] == null || //新建图层，还没有创建资源图层的情况
						Object.getOwnPropertyNames(resourceItems[currentLayerName]).length < 1) { //创建的资源图层，但是删除了的情况
						layer.msg("还未创建资源图层，无法开启绘画模式");
						return false;
					}
					viewMode();
					switchFlag = !switchFlag;
				}
			})
		}
		
		/**
		 * 地图的value，对于某个数据字典
		 * 地图的名字
		 * 地图的图片保留
		 */
		var layerMapKey="";
		var layerMapName="";
		var layerMapImg="";
		
		function layerInfoWindow(){
			var fromWindow =
				"<form class=\"layui-form layui-form-pane\" lay-filter=\"layer-info-form\" id=\"layer-info-form\" action=\"\" style=\"display: none;\">" +
				"<div class=\"layui-form-item\" style=\"width: 80%;margin: 5% auto;\">" +
				"<label class=\"layui-form-label\">图层名称</label>" +
				"<div class=\"layui-input-block\">" +
				"<input type=\"text\" name=\"layerName\" id=\"layer-name\" lay-verify=\"required\" placeholder=\"请输入图层名称\" class=\"layui-input\">" +
				"</div>" +
				"</div>" +
				"<div class=\"layui-form-item\" style=\"width: 80%;margin: 5% auto;\">" +
				"<label class=\"layui-form-label\">地图</label>" +
				"<div class=\"layui-input-block\">" +
				"<select name=\"layerMapKey\" id=\"layer-select\" lay-verify=\"required\"></select>"+
				"</div>" +
				"</div>" +
				"<div class=\"layui-form-item\" style=\"width: 80%;margin: 5% auto;\">" +
				"<div class=\"layui-input-block\">" +
				"<button type=\"submit\" class=\"layui-btn layui-btn-sm\" lay-submit=\"\" lay-filter=\"layer-info-submit\">添加</button>" +
				"<button type=\"reset\" class=\"layui-btn layui-btn-sm layui-btn-normal\" id=\"layer-info-cancel\">取消</button>" +
				"</div>" +
				"</div>" +
				"</form>";
			container.append(fromWindow);
			var cancel = $("#layer-info-cancel");
			cancel.click(function(e) {
				layer.closeAll();
			});
			//监听提交
			form.on('submit(layer-info-submit)', function(data) {
				//资源图层开启才开启绘画模式
				addResourceButton.show();
				layerMapKey=data.field.layerMapKey;
				mapPath(layerMapKey);
				layerMapName=layerInfoForm.find(".layui-select-title input[type=text]").val();
				addLayer(data.field.layerName); //第二个为默认输入框内容
				layer.closeAll();
				layer.msg("新图层添加成功");
				return false;
			});
		}
		
		var DEFAULT_LAYER_SELECT = "<option value=\"\">请选择地图</option>",
		EMPTY_LAYER_SELECT = "<option value=\"V\" data-img=\"I\">T</option>",
		LAYER_V = "V",
		LAYER_T = "T",
		LAYER_I = "I";
		
		function switchMap(url){
			
			bm.css({
				background: 'url(' + url+ ') no-repeat',
				backgroundSize: '100% 100%',
				backgroundColor:"#dedede"
			});
		}
		
		function mapPath(value){
			layerMapImg = layerInfoForm.find("select option[value="+value+"]").data("img");
			bm.css({
				background: 'url(' + layerMapImg+ ') no-repeat',
				backgroundSize: '100% 100%'
			});
		}
		
		function layerSelectedOption(value,text,img){
			return EMPTY_LAYER_SELECT.replace(LAYER_V,value).replace(LAYER_T,text).replace(LAYER_I,img);
		}
		
		/**请求图层信息
		 * @param {Object} url
		 */
		function reqLayerInfo(url){
			layerSelected.empty();//清空内容
			//根据请求获得内容
			var layerSelect = DEFAULT_LAYER_SELECT;
			$.ajax({
				url:url,
				type:"GET",
				dataType:"json",
				success:function(e){
					if(e.code===200){
						var data = e.data;
						for(var d in data){
							layerSelect+=layerSelectedOption(data[d].value,data[d].text,data[d].img);
						}
						layerSelected.append(layerSelect);
						layerInfoName.val("新建图层-" + layerCount)
						form.render();//重新渲染
						//弹出
						layer.open({
							type: 1,
							title: '添加图层',
							area: ['20%', '30%'],
							shade: 0.4,
							resize: false,
							content: layerInfoForm
						});
					}else{
						layer.msg("请求失败");
					}
				},
				statusCode:{
					404:function(){
						alert("数据请求 404");
					}
				},
			});
		}

		/**
		 * 生成 y 的标签图
		 */
		function yPanel() {
			var yPanel = "<div class='coordinate-ypanel'></div>";

			container.append(yPanel);
		}

		/** 将px切除掉
		 * @param {Object} px 带有px的值
		 */
		function parsePx(px) {
			var index = px.indexOf("px");
			if (index == -1) {
				throw "容器长宽高目前只支持px为单位的参数";
			}
			return px.substring(0, index);
		}

		/** 获得一个保留两位小数的除法结果
		 * @param {Object} divisor 除数
		 * @param {Object} dividend 被除数
		 * @param {Object} saveNumer 保留几位小数
		 */
		function computRatio(divisor, dividend, saveNumer) {
			return (divisor / dividend).toFixed(saveNumer)
		}

		function check(pro, config) {
			return (pro in config)&&pro!=="";
		}

		function throwEx(msg) {
			throw msg;
		}

		function currentPointCount() {
			return "p-" + areasCount + "-" + pointCount;
		}

		/**
		 *  绘画键位的开启
		 * @param {Object} flag  true 开启，false为关闭
		 */
		function drawSwitch(flag) {
			draw = flag;
		}

		function addPoint(x, y, color) {
			var size = 10;
			var className = "p-" + areasCount + "-" + (++pointCount);
			var px = parseInt(x / xRatio);
			var py = parseInt(y / yRatio);
			var style = "background-color:" + color + ";width:" + size + "px;height:" + size +
				"px;border-radius:10px;top:" + parseInt(py - (size / 2)) + "px;left:" + parseInt(px - (size / 2)) +
				"px;position:absolute;cursor:pointer;";
			var point = "<div class='" + className + "' style=" + style + " ></div>";
			map.append(point);
			var p = map.find("." + className);
			p.mousedown(function(e) {
				if (3 == e.which) { //右键
					//弹出菜单，类似是否删除这个点
					pointMenu.show();
					pointMenu.offset({
						left: e.pageX,
						top: e.pageY
					});
					//缓存数据
					removePointMenu.data("target", e.target.className);
				} else if (1 == e.which) { //左键
					if (!isView()) {
						confirmWindow('连成区域', '你确定要和此点相连形成区域吗，此操作将会将没有纳入区域的点删除。', function() {
							areaclose(e);
						});
					}
				}
				return false; //禁止传播
			})
			//统一jquery对象入库
			pts[className] = {
				point: map.find("." + className),
				x: x,
				x: y,
				px: parseFloat(px),
				py: parseFloat(py)
			};
		}

	}

	var map = new map();

	exports(MOD_NAME, map);

});
