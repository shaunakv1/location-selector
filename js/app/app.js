(function (window, document) {
    AccessifyHTML5();
    prettyPrint();
    var layout   = document.getElementById('layout'),
        menu     = document.getElementById('menu'),
        menuLink = document.getElementById('menuLink');

    function toggleClass(element, className) {
        var classes = element.className.split(/\s+/),
            length = classes.length,
            i = 0;

        for(; i < length; i++) {
          if (classes[i] === className) {
            classes.splice(i, 1);
            break;
          }
        }
        // The className is not found
        if (length === classes.length) {
            classes.push(className);
        }

        element.className = classes.join(' ');
    }

    menuLink.onclick = function (e) {
        var active = 'active';

        e.preventDefault();
        toggleClass(layout, active);
        toggleClass(menu, active);
        toggleClass(menuLink, active);
    };

    var ls = new LocationSelector({
        inputTargetId : 'autocomplete',
        map:{
            target: 'map',
            markerIconUrl: 'img/marker.png'
            //width: 550, use full width
            /*height: 500,*/
           // basemapUrl: 'http://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
        },
        error: function (error) {
            console.log(error.message);
        },
        onLocationSelect: function(location){
            console.log(location);
            $('#locationSelectOutput').removeClass('prettyprinted').html(JSON.stringify(location, null, 2));
            prettyPrint();
        },
    });

    $('#locationSelectOutput').flowtype({
        minimum   : 380,
        maximum   : 1200,
        minFont   : 12,
        maxFont   : 40,
        fontRatio : 25
    });

}(this, this.document));
