// 봉봉봉 재고·가격판. 올투모로우 관제 패널이 이 파일을 고친다(손으로 고쳐도 된다).
// 규칙: 아래 window.STOCK = { ... }; 안의 JSON만 바꾼다. 주석은 이 위에만 둔다.
//  labor    시급(원). 게임 시간당 값, 웹사이트 구간 값, 봇 제작비가 모두 이것을 따라 다시 계산된다
//  aiHour   Claude 사용료(원/시간)
//  aiSale   AI로 만드는 상품(aiItems) 할인율(%). 0이면 할인 표시가 사라진다
//  aiItems  할인을 받는 상품 id
//  soldOut  일시품절 상품 id. 진열대에 '일시품절'이 붙고 담을 수 없다
//  price    정해진 값 상품의 가격(원)
// 상품 id: game web bot read song oracle research xpost dm ss0feat partner
window.STOCK = {
  "labor": 16000,
  "aiHour": 5000,
  "aiSale": 50,
  "aiItems": ["game", "web", "bot", "ss0feat"],
  "soldOut": [],
  "price": {"song": 2000, "research": 10000, "xpost": 1000, "dm": 5000}
};
