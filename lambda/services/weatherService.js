const axios = require('axios');
const logger = require('../utils/logger');

class WeatherService {
  constructor() {
    this.apiKey = process.env.WEATHER_API_KEY || '';
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
    this.useMock = !this.apiKey || this.apiKey === '';
  }

  async getWeather(city) {
    try {
      if (this.useMock) {
        return this.getMockWeather(city);
      }

      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          q: city,
          appid: this.apiKey,
          units: 'metric',
          lang: 'zh_cn'
        },
        timeout: 5000
      });

      const data = response.data;
      return {
        success: true,
        data: {
          city: data.name,
          temperature: Math.round(data.main.temp),
          description: data.weather[0].description,
          humidity: data.main.humidity,
          windSpeed: data.wind.speed,
          icon: data.weather[0].icon
        }
      };
    } catch (error) {
      logger.warn('天气API调用失败，使用模拟数据', { error: error.message, city });
      return this.getMockWeather(city);
    }
  }

  getMockWeather(city) {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
    
    const seasons = [
      { name: '冬季', temp: [-5, 8] },
      { name: '春季', temp: [10, 22] },
      { name: '夏季', temp: [25, 35] },
      { name: '秋季', temp: [15, 25] }
    ];
    
    const seasonIndex = Math.floor((dayOfYear - 1) / 91) % 4;
    const season = seasons[seasonIndex];
    
    const baseTemp = season.temp[0] + Math.random() * (season.temp[1] - season.temp[0]);
    const temperature = Math.round(baseTemp);
    
    const conditions = [
      { desc: '多云', icon: '03d' },
      { desc: '晴', icon: '01d' },
      { desc: '小雨', icon: '10d' },
      { desc: '阴', icon: '04d' },
      { desc: '雷阵雨', icon: '11d' }
    ];
    
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    
    const humidity = 40 + Math.floor(Math.random() * 40);
    const windSpeed = 2 + Math.floor(Math.random() * 6);

    return {
      success: true,
      data: {
        city: city || '商丘',
        temperature,
        description: condition.desc,
        humidity,
        windSpeed,
        icon: condition.icon
      }
    };
  }

  formatWeatherMessage(weatherData) {
    if (!weatherData || !weatherData.success) {
      return '抱歉，暂时无法获取天气信息。';
    }

    const data = weatherData.data;
    return `${data.city}今天的天气：
🌡️ 温度：${data.temperature}°C
☁️ 天气：${data.description}
💧 湿度：${data.humidity}%
🌬️ 风速：${data.windSpeed} m/s

祝您用餐愉快！😊`;
  }
}

module.exports = new WeatherService();