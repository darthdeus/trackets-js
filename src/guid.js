function GuidGenerator(key) {
  this.key = key;

  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1);
  };

  this.generateGuid = function() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
           s4() + '-' + s4() + s4() + s4();
  };

  this.assignGuid = function() {
    if (window.localStorage) {
      var guid = window.localStorage.getItem(key);

      if (!guid) {
        guid = this.generateGuid();
        window.localStorage.setItem(key, guid);
      }

      return guid;
    }
  };

  this.clearGuid = function() {
    window.localStorage.removeItem(key);
  };
}

