// gross fix for Fetch
document.origin = 'http://hairarrow.design';

// Templates
// ===============================================
const container = `<div class=container />`;

const welcomeContainer = `
  <div class=setup>
    <h1>SR</h1>
  </div>
`;

// Game Class
// ===============================================
var testStocks = ['aapl', 'goog', 'fb'];
function app() {
  const $app = $(container),
        model = {
          timeOpt: 1,
          chartQty: 1,
          gameSeriesQty: 365,
          balance: 10000,
          equity: 0,
          openP: 0,
          positions: [],
          stocks: [],
          gameSpeed: 1, // lower is faster
        },
        timeOptions = chartQty = [1, 2, 3];

  model.getPL = () => model.equity - model.balance;
  model.profits = () => model.equity > 0 ? true : false;

  const WelcomeView = () => {
    const $module = $(welcomeContainer);

    const selectTime = () => {
      const $container = $(`<div class=setup__time />`),
            $label = $(`<label />`).text('Time'),
            $c = $(`<select />`);
      timeOptions.forEach((n) => $c.append($(`<option />`).val(n).text(n)));
      $c.on('change', (e) => model.timeOpt = $(e.target).val());
      $container.append($label, $c);
      return $container;
    }

    const selectChartQty = () => {
      const $container = $(`<div class=setup__charts />`),
            $label = $(`<label />`).text('Charts'),
            $c = $(`<select />`);
      chartQty.forEach((n) => $c.append($(`<option />`).val(n).text(n)));
      $c.on('change', (e) => model.chartQty = $(e.target).val());
      $container.append($label, $c);
      return $container;
    }

    const startGameButton = () => {
      const $button = $(`<button />`).text('Start Game');
      $button.on('click', () => gameEngine(model.timeOpt, model.chartQty));
      return $button;
    }

    $module.append(selectTime(), selectChartQty(), startGameButton());

    return $module;
  }

  const createGameView = () => {
    this.game = {
      $dom: $(`<div class=game-container />`),
      components: {
        $header: $(`<div class=game-header />`),
        $portfolio: $(`<div class=portfolio />`)
      },
      modules: {
        $timer: $(`<div class=game-header__timer />`),
        $portfolioBalance: $(`<div class=game-header__balance />`),
        $portfolioEquity: $(`<div class=game-header__equity />`)
      },
    };

    this.game.buildPortfolio = () => {
      const addStocks = () => {
        for (var i = 0; i < model.chartQty; i++) {
          let stock = Stock(testStocks[i]);
          model.stocks.push(stock);
          this.game.components.$portfolio.append(stock.$dom);
        }
      }

      addStocks();
    }

    this.game.buildPortfolio();

    this.game.components.$header.append(
      this.game.modules.$timer,
      this.game.modules.$portfolioBalance,
      this.game.modules.$portfolioEquity
    );

    this.game.$dom.append(
      this.game.components.$header,
      this.game.components.$portfolio
    );

    this.game.update = () => {
      this.game.modules.$timer.text(model.timer);
      this.game.modules.$portfolioBalance.text(displayNumber(model.balance));
      this.game.modules.$portfolioEquity.text(displayNumber(model.equity));
    }

    return this.game;
  }

  const Stock = ticker => {
    let stock = {
      name: ticker,
      holding: false,
      model: {
        blockSize: 0,
        position: {
          size: 0,
          avgCost: 0,
          pl: 0,
          equity: 0,
          pl: {
            value: 0,
            percent: 0 
          },
        },
        transactions: [],
        price: {},
        initialPrice: 0,
        pl: {
          value: 0,
          percent: 0
        },
        day: 0,
        series: {
          data: {},
          keys: [],
        },
        gameSeries: {
          data: [],
          keys: [],
        }
      },
      $dom: $(`<div class=stock />`),
      components: {
        $header: $(`<div class=stock__header />`),
        $position: $(`<div class=stock__position />`),
        $chart: $(`<div class=stock__chart />`),
        $controller: $(`<div class=stock__controller />`),
      },
      modules: {
        $name: $(`<div class=stock__name />`),
        $price: $(`<div class=stock__price />`),
        $plValue: $(`<div class=stock__pl-value />`),
        $plPercent: $(`<div class=stock__pl-percent />`),
        $shares: $(`<div class=stock__percent />`),
        $pps: $(`<div class=stock__pps />`),
        $equity: $(`<div class=stock__equity />`),
        $positionPl: $(`<div class=stock__position-pl />`),
        $buy: $(`<button class=stock__buy type=button />`),
        $sell: $(`<button class=stock__sell type=button />`)
      }
    };

    const timeSeries = getStockInfo(ticker).then(data => stock.init(data));

    const seriesChunk = (series) => {
      let chunkStart = Math.floor(
        Math.random() * (series.keys.length - model.gameSeriesQty));
      let chunkKeys = series.keys
        .slice(chunkStart, chunkStart + model.gameSeriesQty);

      for (let i = 0; i < chunkKeys.length; i++) {
        stock.model.gameSeries.data.unshift(series.data[chunkKeys[i]]);
        stock.model.gameSeries.keys.unshift(chunkKeys[i]);
      }
    }

    const getPositionInfo = (positions) => { 
      if (positions.length === 0) return false;
      if (positions.length === 1) {
        return {
          equity: positions[0].size * stock.model.price.close,
          avgPPS: positions[0].price,
          originalEquity: positions[0].totalNotional,
          pl: {
            value: (stock.model.position.size * stock.model.price.close) - positions[0].totalNotional,
            percent: plPercent(positions[0].totalNotional, stock.model.position.size * stock.model.price.close)
          }
        }
      }
      let equities = positions.map((s) => s.totalNotional);
      let equity = equities.reduce((a, b) => a + b);
      return {
        equity: stock.model.position.size * stock.model.price.close,
        avgPPS: equity / stock.model.position.size,
        originalEquity: equity,
        pl: {
          value: (stock.model.position.size * stock.model.price.close) - equity,
          percent: plPercent(equity, stock.model.position.size * stock.model.price.close)
        }
      }
    }

    stock.components.$header.append(
      stock.modules.$name,
      stock.modules.$price,
      stock.modules.$plValue,
      stock.modules.$plPercent
    );

    stock.components.$position.append(
      stock.modules.$shares,
      stock.modules.$pps,
      stock.modules.$equity,
      stock.modules.$positionPl
    );

    stock.components.$controller.append(
      stock.modules.$buy,
      stock.modules.$sell,
    );

    stock.$dom.append(
      stock.components.$header,
      stock.components.$position,
      stock.components.$chart,
      stock.components.$controller
    );

    stock.modules.$buy.on('click', () => {
      $GameView.update();
      stock.transaction('buy',
        stock.model.blockSize,
        stock.model.price.close
      );
    });

    stock.modules.$sell.on('click', () => {
      $GameView.update();
      stock.transaction('sell',
        stock.model.position.size,
        stock.model.price.close
      );
    });

    stock.transaction = (direction, size, price) => {
      let totalNotional = price * size;
      if (direction === 'buy') {
        if (totalNotional > model.balance) {
          return false;
        } else {
          model.balance -= totalNotional;
          stock.holding = true;
          stock.model.position.size += size;
          stock.model.transactions.push({
            direction: direction,
            totalNotional: totalNotional,
            size: size,
            price: parseFloat(price)
          });
          stock.components.$position.addClass('stock__position--open');
        }
      } else if (direction === 'sell') {
        if (size > stock.model.position.size ||
            stock.model.position.size === 0) {
          return false;
        } else {
          model.balance += totalNotional;
          stock.holding = false;
          stock.model.position.size -= size;
          stock.model.transactions = [];
          stock.components.$position.removeClass('stock__position--open');
        }
      }
    }

    stock.update = () => {
      let positionInfo = getPositionInfo(stock.model.transactions);
      let priceData = stock.model.gameSeries.data[stock.model.day];
      let price = {
        open: priceData['1. open'],
        high: priceData['2. high'],
        low: priceData['3. low'],
        close: priceData['4. close'],
        volume: priceData['5. volume']
      };
      let blockSize = Math.floor((model.balance * .1) / price.close);

      // update model
      stock.model.price = price;
      stock.model.pl.value = price.close - stock.model.initialPrice;
      stock.model.pl.percent = plPercent(
        stock.model.pl.value, stock.model.initialPrice);
      if (stock.holding) {
        stock.model.position.equity = positionInfo.equity;
        stock.model.position.avgCost = positionInfo.avgPPS;
        stock.model.position.pl.value = positionInfo.pl.value;
        stock.model.position.pl.percent = positionInfo.pl.percent;
      }
      if (blockSize === 0 && model.balance > price.close) {
        stock.model.blockSize = 1;
      } else if (blockSize === 0 && model.balance < price.close) {
        stock.model.blockSize = 0;
      } else {
        stock.model.blockSize = blockSize;
      }
      // update components
      stock.modules.$name.text(stock.name);
      stock.modules.$price.text(displayNumber(stock.model.price.close));
      stock.modules.$plValue.text(displayNumber(stock.model.pl.value));
      stock.modules.$plPercent.text(displayNumber(stock.model.pl.percent));
      stock.modules.$shares.text(stock.model.position.size);
      stock.modules.$pps.text(displayNumber(stock.model.position.avgCost));
      stock.modules.$equity.text(displayNumber(stock.model.position.equity));
      stock.modules.$positionPl.text(displayNumber(stock.model.position.pl.value));
      stock.modules.$buy.text(
        'Buy ' + stock.model.blockSize
        + ' @ ' + displayNumber(stock.model.price.close)
      );
      stock.modules.$sell.text(
        'Sell ' + stock.model.position.size
        + ' @ ' + displayNumber(stock.model.price.close)
      );
      if (stock.model.pl.value > 0) {
        stock.modules.$plValue.attr('style', 'color: green');
        stock.modules.$plPercent.attr('style', 'color: green');
      } else {
        stock.modules.$plValue.attr('style', 'color: red');
        stock.modules.$plPercent.attr('style', 'color: red');
      }
      if (stock.model.position.pl.value > 0) {
        stock.modules.$positionPl.attr('style', 'color: green');
      } else {
        stock.modules.$positionPl.attr('style', 'color: red');
      }
    }

    stock.init = (data) => {
      let stockInterval = () => { return 1000 / (model.gameSeriesQty / (model.timeOpt * 60)) };
      stock.model.series = {
        data: data['Time Series (Daily)'],
        keys: Object.keys(data['Time Series (Daily)']),
      }
      seriesChunk(stock.model.series);
      stock.model.initialPrice = stock.model.gameSeries.data[0]["1. open"];
      let stockTimer = setInterval(() => {
        if (model.timer === 0) {
          clearInterval(stockTimer);
          return false;
        }
        stock.update();
        stock.model.day += 1;
      }, stockInterval());
    }

    return stock;
  }

  const gameEngine = (time, nCharts) => {
    model.timer = model.timeOpt * 60;
    $WelcomeView.detach();
    $GameView = createGameView();
    $app.append($GameView.$dom);

    // TODO wait for all data to load 
    let gameIsActive = setInterval(() => {
      if (model.timer === 0) {
        clearInterval(gameIsActive);
        // TODO victory screen or something like that
        return false;
      }
      model.equity = totalEquity(model.stocks);
      model.timer -= 1;
      $GameView.update();
    }, model.gameSpeed * 1000)
  }

  let $WelcomeView = WelcomeView(),
      $GameView;

  $app.append($WelcomeView);

  return $app;
}

const displayNumber = (n) => Number(n).toFixed(2);

const plPercent = (n, o) => {
  if (n >= 0) {
    return 100 + (((n - o) / o) * 100)
  } else {
    return 100 - (((o - n) / o) * 100)
  }
}

const totalEquity = (positions) => {
  let openPositions = positions
    .map((s) => { if (s.holding) return s; })
    .filter((s) => s != undefined);
  if (openPositions.length === 0) return 0;
  if (openPositions.length === 1) {
    return openPositions[0].model.position.equity;
  }
  return positions
    .map((s) => s.model.position.equity)
    .filter((s) => s != undefined)
    .reduce((a, b) => a + b);
}

const getStockInfo = (ticker, callback) => {
  const alphaVantage = {
    url: 'https://www.alphavantage.co/query?',
    function: 'TIME_SERIES_DAILY',
    output: 'full',
    key: '0Z5MGYRM1FS0VOFP',
  };

  const buildQuery = () => {
    let query = alphaVantage.url;
    query += 'function=' + alphaVantage.function;
    query += '&symbol=' + ticker;
    query += '&outputsize=' + alphaVantage.output;
    query += '&apikey=' + alphaVantage.key;
    return query;
  }

  const cachedFetch = url => {
    let expiry = (24 * 60) * 60;
    let cacheKey = url;
    let cached = localStorage.getItem(cacheKey);
    let whenCached = localStorage.getItem(cacheKey + ':ts');

    if (cached !== null && whenCached !== null) {
      let age = (Date.now() - whenCached) / 1000;

      if (age < expiry) {
        let response = new Response(new Blob([cached])).json();
        return Promise.resolve(response);
      } else {
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(cacheKey + ':ts');
      }
    }

    return fetch(url, { mode: 'cors' }).then(response => {
      if (response.status === 200) {
        let ct = response.headers.get('Content-Type');
        if (ct && (ct.match(/application\/json/i))) {
          response.clone().text().then(content => {
            localStorage.setItem(cacheKey, content);
            localStorage.setItem(cacheKey + ':ts', Date.now());
          });
        }
      }

      return response.json();
    });
  }

  return cachedFetch(buildQuery());
}

$('.app').append(app());

// NOTES 
// run a for loop
function getBestProfit(prices) {
  let low = high = profit = 0;

  prices.forEach(price => {
    if (low === 0 && high === 0) {
      low = high = price
    }

    if (price > high) high = price

    if (price < low) {
      let tmpProfit = high - low;
      if (tmpProfit > profit) profit = tmpProfit;
      low = high = price
    }
  });

  return profit;
}
