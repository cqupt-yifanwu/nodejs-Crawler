//此文件包含主要的路由逻辑
var express = require('express');
var router = express.Router();
var url = require('url');
var superagent = require('superagent'),
	cheerio = require('cheerio'),         // 将HTML告诉你的服务器，可以用jquery的方式处理
	eventproxy  = require('eventproxy');  // 控制并发的模块
/* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'Express' });
// });

//核心逻辑

 router.get('/',function (req, res, next) {
  var cnodeUrl = 'https://cnodejs.org/';  //要爬取的url
  var items = [];

  //用superagent 去抓取 http://condejs.org/的内容
  superagent.get(cnodeUrl)
    .end(function (err, sres) {
      //常规的错误处理
      if(err){
        return next(err);
      }

      // sres.text 里面存储着网页的 html 内容，将它传给 cheerio.load 之后
      // 就可以得到一个实现了 jquery 接口的变量，我们习惯性地将它命名为 `$`
      // 我们现在就可以用jquery的方法将我们得到的数据进行想要的处理
      console.log(sres.text);
      var $ = cheerio.load(sres.text);
      $('#topic_list .topic_title').each(function (idx, element){  // 遍历
        var $element = $(element);  //包装成jquery对象

         // $element.attr('href') 本来的样子是 /topic/542acd7d5d28233425538b04我们用 url.resolve 来自动推断出完整 url，变成 
         // https://cnodejs.org/topic/542acd7d5d28233425538b04 的形式
        var href = url.resolve(cnodeUrl,$element.attr('href'));
        items.push(href);        // 这里是所有要爬取的链接的集合
      });
    console.log(items);
    //console.log(items.length);
    //eventproxy 实例
    var ep = new eventproxy();

   //命令ep重复监听 items.length次 ‘topic_html’时间后再行动
    ep.after('topic_html', items.length ,function(topics){
      // topics 是个数组，包含了 40 次 ep.emit('topic_html', pair) 中的那 40 个 pair
      //start

      topics = topics.map(function(topicPair){
        var topicUrl = topicPair[0];   
        var topicHtml = topicPair[1]; 
        var $ = cheerio.load(topicHtml);
        return({
          title:$('.topic_full_title').text().trim(),
          href:topicUrl,
          comment1:$('.reply_content').eq(0).text().trim()
        });
      });
      // console.log(topics);
     });


    items.forEach(function(topicUrl){      
      superagent.get(topicUrl)
          .end(function(err,res){
            //console.log('fetch'+topicUrl+'successful');
            ep.emit('topic_html',[topicUrl,res.text]);//第二个会传递到after执行函数的参数中
            //res.text是网页整体源码
          })
    })

  });

})


module.exports = router;
