# Web User Interface

This project hosts the Web User Interface code.  This is the front-end
HTML and Javascript which runs in the browser.  The code can be customized and
re-deployed to a or Raivin platform.

# Deployment

The HTML pages are found under `src` and the javascript is under `src/js`. These are static 
HTML files and which can be copied to the target platform. The default webui is found 
on the under `/usr/share/webui` which is read-only and cannot be modified, as it is managed
by the Torizon for OS image.  The customized HTML folder should instead
be copied to either the default home as `/home/torizon/webui` or into
`/usr/local/share/webui` which is writeable (requires sudo).

Once deployed the webui configuration needs to be updated to point to the new
location.  Edit the configuration file `/etc/default/webui` and modify the
`DOCROOT` variable to point to the new location.

Once you've modified the `/etc/default/webui` configuration you must restart the
webui server with the following command.  Then simply open and refresh the
browser window with the WebUI to enact the changes.

```
sudo systemctl restart webui
```

NOTE: The `webui` folder is renamed from HTML folder but can be any name, just make
sure the full path of the folder which holds the `index.html` file is used for
DOCROOT.

# License

This project is licensed under the AGPL-3.0 or under the terms of the DeepView AI Middleware Commercial License.

# Support

Commercial Support is provided by Au-Zone Technologies through the [DeepView Support](https://support.deepviewml.com) site.
