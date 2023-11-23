// 전역 변수 선언
var map; // 지도 객체
var currentLat, currentLng; // 현재 위치의 위도와 경도
var markers = []; // 마커를 저장할 배열
var currentInfowindow = null; // 현재 열린 인포윈도우
var currentLocationMarker; // 현재 위치 마커
var searchResults = []; // 검색된 장소의 결과를 저장할 배열
var markerIndices = []; // 마커의 인덱스를 저장할 배열


function createCurrentLocationMarker(lat, lng) {
  if (currentLocationMarker) {
    currentLocationMarker.setPosition(new kakao.maps.LatLng(lat, lng));
  } else {
    currentLocationMarker = new kakao.maps.Marker({
      map: map,
      position: new kakao.maps.LatLng(lat, lng),
      // 현재 위치 마커에 대한 스타일링 (예: 다른 색상이나 아이콘)
      image: new kakao.maps.MarkerImage(
        // 마커 이미지 URL 및 사이즈 설정
        'http://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png',
        new kakao.maps.Size(64, 69),
        {
          offset: new kakao.maps.Point(27, 69),
        }
      )
    });
  }
}




// 현재 위치 정보 가져오기
navigator.geolocation.getCurrentPosition(successGps, failGps);

// GPS 정보 가져오기 성공 시 호출되는 함수
function successGps(position) {
  currentLat = position.coords.latitude; // 현재 위치의 위도
  currentLng = position.coords.longitude; // 현재 위치의 경도

  // 지도 생성
  const container = document.getElementById("map"); // 지도를 표시할 HTML 요소
  const options = {
    center: new kakao.maps.LatLng(currentLat, currentLng), // 지도의 중심 좌표 설정
    level: 3, // 지도의 확대 레벨 설정
  };
  map = new kakao.maps.Map(container, options); // 지도 객체 생성
  // 현재 위치 마커 생성
  createCurrentLocationMarker(currentLat, currentLng);

  addEventListenersToItems(); // 네비게이션 메뉴 아이템에 이벤트 리스너 추가
}

// GPS 정보 가져오기 실패 시 호출되는 함수
function failGps() {
  console.log("Geolocation Failed");
  // 실패 시 별도의 기본 위치 설정 필요할듯!
}

// 네비게이션 메뉴 아이템에 이벤트 리스너 추가
function addEventListenersToItems() {
  const items = document.querySelectorAll(".keyword"); // 네비게이션 메뉴 아이템들을 선택
  items.forEach((item) => {
    item.addEventListener("click", function (event) {
      event.preventDefault(); // 기본 동작 방지
      removeMarkers(); // 모든 마커 제거
      closeInfowindow(); // 인포 윈도우 닫기
      searchAndDisplay(item.textContent.trim()); // 키워드로 장소 검색 및 마커 표시
    });
  });
}

// 키워드 설정
function mapKeyword(originalKeyword) {
  const keywordMap = {
    카페: "카페",
    병원: "병원",
    세탁방: "세탁",
  };
  return keywordMap[originalKeyword] || originalKeyword;// 매핑된 키워드가 없는 경우 원래 키워드 사용
}

// 현재 위치 재설정
function resetCurrentLocation() {
  navigator.geolocation.getCurrentPosition(function(position) {
    currentLat = position.coords.latitude;
    currentLng = position.coords.longitude;
    map.setCenter(new kakao.maps.LatLng(currentLat, currentLng));
    // 현재 위치 마커 업데이트
    createCurrentLocationMarker(currentLat, currentLng);
  }, function() {
    console.log("현재 위치 재설정 실패");
  });
}

// 키워드로 장소 검색 및 마커 표시
function searchAndDisplay(keyword) {
  var mappedKeyword = mapKeyword(keyword);
  var ps = new kakao.maps.services.Places();
  var placesOption = {
    location: new kakao.maps.LatLng(currentLat, currentLng),
  };

  ps.keywordSearch(
    mappedKeyword,
    function (data, status, pagination) {
      if (status === kakao.maps.services.Status.OK) {
        // 거리 계산 및 정렬
        searchResults = data
          .map(function (place) {
            place.distance = getDistanceFromLatLonInKm(currentLat, currentLng, place.y, place.x);
            return place;
          })
          .sort(function (a, b) {
            return a.distance - b.distance;
          })
          .slice(0, 5); // 상위 5개 결과만 저장

        // 마커 초기화
        markers.forEach(function (marker) {
          marker.setMap(null); // 기존 마커 제거
        });
        markers = [];

        var bounds = new kakao.maps.LatLngBounds();
        searchResults.forEach(function (place) {
          var marker = displayMarker(place, bounds);
          markers.push(marker); // 마커 저장
        });

        map.setBounds(bounds);

        // 리스트 생성
        displayPlacesInfo(searchResults, currentLat, currentLng);
      } else {
        console.log("검색 결과가 없습니다");
      }
    },
    placesOption
  );
}

// 검색된 장소들의 정보를 화면에 표시하는 함수
function displayPlacesInfo(places, currentLat, currentLng) {
  var listEl = document.querySelector('.vstack');
  listEl.innerHTML = '';

  // 거리 계산 및 정렬
  var placesWithDistance = places.map(function (place) {
    var distance = getDistanceFromLatLonInKm(currentLat, currentLng, place.y, place.x);
    return { place: place, distance: distance };
  });

  placesWithDistance.sort(function (a, b) {
    return a.distance - b.distance; // 거리에 따라 정렬
  });

  placesWithDistance.forEach(function (item, index) {
    var placeEl = document.createElement('div');
    placeEl.className = 'd-flex p-2 location_list';
    placeEl.innerHTML = item.place.place_name + ' - ' + item.distance.toFixed(1) + 'km';
    listEl.appendChild(placeEl);

    placeEl.addEventListener('click', function() {
      openInfowindowAtMarker(index);
    });
  });
}



// 두 좌표 간의 거리 계산 (킬로미터 단위)
function getDistanceFromLatLonInKm(lat1, lng1, lat2, lng2) {
  var R = 6371; // 지구의 반지름(km)
  var dLat = deg2rad(lat2-lat1);
  var dLon = deg2rad(lng2-lng1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // 거리(km)
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}



// 마커를 표시하는 함수 (인덱스 추가)
function displayMarker(place, bounds, index) {
  var marker = new kakao.maps.Marker({
    map: map,
    position: new kakao.maps.LatLng(place.y, place.x)
  });

  markers.push(marker);
  markerIndices[index] = markers.length - 1; // 마커의 실제 인덱스 저장

  var infowindow = new kakao.maps.InfoWindow({ zIndex: 1 }); // 인포윈도우 객체 생성
  kakao.maps.event.addListener(marker, "click", function () {
    if (currentInfowindow === infowindow) {
      // 이미 열린 인포윈도우를 클릭한 경우
      infowindow.close(); // 인포윈도우 닫기
      currentInfowindow = null;
    } else {
      if (currentInfowindow) {
        // 다른 인포윈도우가 열려있는 경우
        currentInfowindow.close(); // 현재 열린 인포윈도우 닫기
      }
      infowindow.setContent(
        '<div style="padding:5px;font-size:12px;">' +
          place.place_name +
          "</div>",
      ); // 인포윈도우에 장소 이름 표시
      infowindow.open(map, marker); // 인포윈도우 열기
      currentInfowindow = infowindow; // 현재 열린 인포윈도우로 설정
    }
  });

  bounds.extend(new kakao.maps.LatLng(place.y, place.x));
  return marker; // 생성된 마커 반환
}

// 리스트에서 항목을 클릭했을 때 해당 마커의 인포윈도우를 열기
function openInfowindowAtMarker(index) {
  var marker = markers[index]; // 정렬된 순서대로 마커 참조
  if (marker) {
    kakao.maps.event.trigger(marker, 'click');
  }
}


// 모든 마커 제거
function removeMarkers() {
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(null); // 마커를 지도에서 제거
  }
  markers = []; // 마커 배열 초기화
}

// 현재 열린 인포윈도우 닫기
function closeInfowindow() {
  if (currentInfowindow) {
    // 현재 열린 인포윈도우가 있는 경우
    currentInfowindow.close(); // 인포윈도우 닫기
  }
  currentInfowindow = null; // 현재 열린 인포윈도우 초기화
}
