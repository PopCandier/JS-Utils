/*
*  2019/9/4
*  Author : Pop
*  Description : 自定义的分页工具
* */
$(document).ready(function(){
    "use strict";
    /**
     * 分页对象
     */
    window.PAGE={
        option:{
            page:0,//当前多少页
            limit:10,//每页显示多少
            count:126,//数据总数
            showP:3,//前面显示多少分页选项
            showN:1,//后面显示多少选项
            currP:1,//选中的当前页前面会有多少数目
            currN:1//选中的当前页前面会有多少数目
        },
        pageTotal:0,
        context:null,//填充数据所在位置
        context0:null,//分页所在位置
        url:"",
        item:"",
        isInit:false,
        computePageTotal:function(option){
            if(!option){option = this.option;}
            var c = option.count;
            var l = option.limit;
            var m = 0;
            return (m=c%l)>0?Math.floor((c/l))+1:(c/l);
        },
        setOption:function(option){
        	var that = this;
            if(option.hasOwnProperty('page')){that.option.page=option.page;}
            if(option.hasOwnProperty('limit')){that.option.limit=option.limit;}
            if(option.hasOwnProperty('count')){that.option.count=option.count;}
            if(option.hasOwnProperty('showP')){that.option.showP=option.showP;}
            if(option.hasOwnProperty('showN')){that.option.showN=option.showN;}
        },
        initPage:function(id,cid,url,item,option){
        	var that = this;
        	var o = option!=undefined?option:that.option;
            that.context=$(id);//数据填充容器
            that.context0=$(cid);//分页填充容器
            that.url = url;
            that.item = item;
            that.setOption(o);
            that.pageTotal = that.computePageTotal(o);
            //可能存在标签自定义的初始化 todo
            that.pageItemInit();
            that.next();
            that.isInit=true;
            //
        },
        check:function(){return this.isInit;},
        pagePanel:{
        	panel:"",
        	appendPanel:function(e){
        		this.panel+=e;
        	}
        },
        clear:function(){
        	var that = this;
        	that.pagePanel.panel="";
        	that.context0.empty();
        },
        registerEvents:function(){
       		//我们只针对前进后退，点击页数进行跳转，实现原理在于判断是否是相应的className
       		var that = this;
       		var itemConfig = that.pageItemConfig;
       		//从已经append的节点上截取
       		var context0 = that.context0[0];
       		var childNodes = context0.childNodes;
       		childNodes.forEach(function(value,index,arr){
       			if(value.className.indexOf(itemConfig.total.className)!=-1||
       				value.className.indexOf(itemConfig.current.className)!=-1||
       				value.className.indexOf(itemConfig.dian.className)!=-1||
       				value.className.indexOf(itemConfig.jump.className)!=-1){return;}
   				if(value.className.indexOf(itemConfig.prev.className)!=-1){
	   				$(value).click(function(e){that.previous()});
       			}
   				if(value.className.indexOf(itemConfig.next.className)!=-1){
	   				$(value).click(function(e){that.next()});
       			}
       			if(value.className.indexOf(itemConfig.normal.className)!=-1){
       				var jquery_value = $(value);
       				$(value).click(function(e){that.jump(parseInt(jquery_value.text()));});
       			}
       		});
        },	
        pageItemConfig:{
        	total:{
        		className:'result',
        		tag:'span',
        		href:'javascript:;',
        		txt:'#'
        	},
        	normal:{
        		className:'page-number',
        		tag:'a',
        		href:'javascript:;',
        		txt:'#'
        	},
        	current:{
        		className:'current',
        		tag:'span',
        		href:'javascript:;',
        		txt:'#'
        	},
        	prev:{
        		className:'prev',
        		tag:'a',
        		href:'javascript:;',
        		txt:'上一页'
        	},
        	next:{
        		className:'next',
        		tag:'a',
        		href:'javascript:;',
        		txt:'下一页'
        	},
        	dian:{
        		className:'dian',
        		tag:'span',
        		href:'javascript:;',
        		txt:'...'
        	},
        	jump:{
        		className:'dian',
        		tag:'span',
        		href:'javascript:;',
        		txt:'...'
        	}
        },
        pageItemInit:function(){
        	var that = this;
        	var pageItem = that.pageItem;
        	var pageItemConfig = that.pageItemConfig;
        	for(var cfg in pageItemConfig){
        		var cfgObj = pageItemConfig[cfg];
        		pageItem[cfg]=that.createItem(cfgObj.className,cfgObj.tag,cfgObj.href,cfgObj.txt);
        	}
        },
        createItem:function(className,tag,href,txt){return "<"+tag+" class='"+className+"' href='"+href+"' >"+txt+"</"+tag+">";},
        pageItem:{
        	total:{},
        	normal:{},
        	current:{},
        	prev:{},
        	next:{},
        	dian:{},
        	jump:{},
        	setText:function(target,txt){return target.replace(/#/g,txt);}
        },
        hasPrevious:function(num){return num<=1?false:true;},
        hasNext:function(num){return num>=this.pageTotal?false:true;},
        computerTimes:function(num){
        	var times=[];
        	var that = this;
        	var option = that.option;
        	var pageTotal = that.pageTotal;
        	var begin = num-option.currP;
        	var end = num+option.currN;
    		/**
    		 * 如果按照当前传入的数字减去不越界的话，说明传入的值位于总页数的较为中间的位置，那么就保留递减的数字，全部输出
    		 * 如果越界，则就是从第一页开始
    		 * 
    		 * 增加页数也同样的道理，如果不越界，则代表位于较为中间的位置，全部输出，否则截止到最大页数
    		 */
    		times.push(that.hasPrevious(begin)?begin:1);
    		times.push(that.hasNext(end)?end:that.pageTotal);
    		return times;
        	
        },
        move2num:function(num0){
            var that = this;
            var option = that.option;
            var pageItem = that.pageItem;
            var pagePanel = that.pagePanel;
            var len = that.pageTotal;
            var showP = option.showP;
            var showN = option.showN;
            var num = option.page;
            that.clear();
            var total = pageItem.setText(pageItem.total,'共'+len+'页');
            pagePanel.appendPanel(total);
            var t = that.computerTimes(num);
            if(len<=showP){//总页数小于需要显示的页数，那么能显示多少就显示多少
                if(that.hasPrevious(num)){//说明不是第一页，位于中间的位置
                	pagePanel.appendPanel(pageItem.prev);
                    for(var i = t[0],times=t[1];i<=times;i++){
                        if(i==num){pagePanel.appendPanel(pageItem.setText(pageItem.current,i));}
                        else{pagePanel.appendPanel(pageItem.setText(pageItem.normal,i));}
                    }
                    if(that.hasNext(num)){pagePanel.appendPanel(pageItem.next);}//说明也是中间的位置
                    else{/*已经到了最后一页，也没有显示的必要了*/}
                }else{//是第一页，一定会有下一页的
                	for(var i = t[0],times=t[1];i<=times;i++){
                        if(i==num){pagePanel.appendPanel(pageItem.setText(pageItem.current,i));}
                        else{pagePanel.appendPanel(pageItem.setText(pageItem.normal,i));}
                    }
                    if(that.hasNext(num)){pagePanel.appendPanel(pageItem.next);}
                }
            }else{//超出了可显示部分。
                if(that.hasPrevious(num)){
                	pagePanel.appendPanel(pageItem.prev);
                	if(t[0]>1){
                		pagePanel.appendPanel(pageItem.setText(pageItem.normal,1));
                		pagePanel.appendPanel(pageItem.dian);
                	}
                    for(var i = t[0],times=t[1];i<=times;i++){
                        if(i==num){pagePanel.appendPanel(pageItem.setText(pageItem.current,i));}
                        else{pagePanel.appendPanel(pageItem.setText(pageItem.normal,i));}
                    }
//                  if((t[1]+option.showP)>len){/*todo*/}
                    if(len!=(t[1])){
                    	pagePanel.appendPanel(pageItem.dian);
                    	//20 -2 18
                    	for(var i = len,j=(len-showN+1);j<=i;j++){pagePanel.appendPanel(pageItem.setText(pageItem.normal,j));}
                    }
                    if(that.hasNext(num)){pagePanel.appendPanel(pageItem.next);}
                }else{
                	for(var i = t[0],times=t[1];i<=times;i++){
                        if(i==num){pagePanel.appendPanel(pageItem.setText(pageItem.current,i));}
                        else{pagePanel.appendPanel(pageItem.setText(pageItem.normal,i));}
                    }
                    if(len>(showP+showN)){pagePanel.appendPanel(pageItem.dian);
                    for(var i = len,j=(len-showN+1);j<=i;j++){pagePanel.appendPanel(pageItem.setText(pageItem.normal,j));}
                    if(that.hasNext(num)){pagePanel.appendPanel(pageItem.next);}
                }
            }}
            that.context0.append(pagePanel.panel);
            that.registerEvents();
            },
        previous:function(){this.move2num(this.option.page--);},
        next:function(){this.move2num(this.option.page++);},
        jump:function(num){this.move2num(this.option.page=num)},
        active:function (suc,err){
            var that = this;
            var option = that.option;
            //es6
            $.ajax({
                type: "post",
                data: {
                    page:option.page,
                    limit:option.limit,
                },
                url: that.url,
                success: function(data){suc(data);},
                error: function (data) {err(data)}
            });
        }
    }
});
