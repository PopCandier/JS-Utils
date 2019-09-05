window.onload=function(){
	
	waterfall('main','box');
	
	//模拟数据
	var data={
	data:[{
		"src": "../img/1.jpg"
	}, {
		"src": "../img/2.jpg"
	}, {
		"src": "../img/3.jpg"
	}, {
		"src": "../img/4.jpg"
	}, {
		"src": "../img/5.jpg"
	}, {
		"src": "../img/6.jpg"
	}, {
		"src": "../img/7.jpg"
	}, {
		"src": "../img/8.jpg"
	}, {
		"src": "../img/9.jpg"
	}]
}
	var oParent = document.getElementById('main');
	var base = data.data;
	//注册事件
	window.onscroll=function(){
		if(checkScrollSlide()){
			var indexi=0;
			base.map(function(value,index,arr){
				var box = createWaterItem(value.src);
				oParent.appendChild(box);
				var minH = Math.min.apply(null,hArr);
				//查看这个最小的位置是多少
				var index=getMinhIndex(hArr,minH);
				box.style.position='absolute';
				box.style.top= minH+'px';
				box.style.left=hPar[index].offsetLeft+'px';
				hArr[index]+=box.offsetHeight;
			});

//			console.log("布可加载数据");	
		}

	}
}
var hArr=[];
var hPar=[];
var hParIndex=0;
function waterfall(parent,child){
	
	//将main下的所有的class为box的元素全部取出来
	
	var oParent = document.getElementById(parent);
	hPar=getByClass(oParent,child);
//	console.log(oBoxs.length);
// 	你希望提供的列数 ( 页面宽/box的宽)
	var oBoxW = hPar[0].offsetWidth;
//	console.log(oBoxW);
	var cols = Math.floor(document.documentElement.clientWidth/oBoxW);
	//console.log(cols);
	oParent.style.cssText="width:"+oBoxW*cols+"px;margin:0 auto;";
	
	//这个数组一开始存储第一行高度的总和，需要保证要第二行的第一个
	//一定要成功嵌入第一行最短的那一个下main
	//而下一次，则需要保证这个数据将会保存每一列的高度
	hParIndex = hPar.length;
	for(var i=0,len=hParIndex;i<len;i++){
		if(i<cols){//保证是小于一行内的
			hArr.push(hPar[i].offsetHeight);
		}else{
			setPosition(hPar,i);
		}
	}
//	console.log(hArr);
}


function setPosition(arr,i,hPar){
		//第二行以上的元素
		var minH = Math.min.apply(null,hArr);
			//查看这个最小的位置是多少
		var index=getMinhIndex(hArr,minH);
		arr[i].style.position='absolute';
		arr[i].style.top= minH+'px';
			//oBoxs[i].style.left=index*oBoxW+'px';
		if(hParIndex&&typeof(hPar)!=='undefined'){
			arr[i].style.left=arr[index].offsetLeft+'px';
			hArr[index]+=arr[i].offsetHeight;
			//console.log(arr[i].offsetHeight);
		}else{
			arr[i].style.left=arr[index].offsetLeft+'px';
			hArr[index]+=arr[i].offsetHeight;
		}
		
//		console.log(hArr);
		return arr[i];
}

function createWaterItem(imgSrc){
	
	var box = document.createElement("div");
	box.className='box';
	var pic = document.createElement("div");
	pic.className='pic';
	var img = document.createElement("img");
	img.src=imgSrc;
	pic.appendChild(img);
	box.appendChild(pic);
	//setPosition(arr,index);
	return box;
}

//根据class获取元素
function getByClass(parent,clsName){
	 var boxArr = new Array(),//用来获取存储获取所有calss为某个名字的数组
	 oElements = parent.getElementsByTagName('*');
	 for(var i=0,len=oElements.length;i<len;i++){
	 	if(oElements[i].className==clsName){
	 		boxArr.push(oElements[i]);
	 	}
	 }
	 return boxArr;
}

function getMinhIndex(arr,value){

	if(arr&&arr instanceof Array){
		for(var i in arr){
			if(arr[i]==value){
				return i;
			}
		}
	}

}
//是否具有加载条件
function checkScrollSlide(){
	//取出最后一个变量
	var oParent = document.getElementById('main');
	var oBoxs=getByClass(oParent,'box');
	var lastItem = oBoxs[oBoxs.length-1];
	//最后一个元素距离页面顶部的距离
	var lastItemH = lastItem.offsetTop+Math.floor(lastItem.offsetHeight/2);
	//混杂模式||标准模式
	var scrollTop=document.body.scrollTop||document.documentElement.scrollTop;//滚开的距离
	var itemTop = document.body.clientHeight||document.documentElement.clientHeight;//浏览器的窗口
	var allTop = scrollTop+itemTop+Math.floor(lastItem.offsetHeight/2);
	return lastItemH<allTop?true:false;
}
