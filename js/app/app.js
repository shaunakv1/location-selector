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
            //width: 550, use full width
            /*height: 500,*/
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

}(this, this.document));
